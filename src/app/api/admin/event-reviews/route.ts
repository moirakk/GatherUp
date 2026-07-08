import { NextResponse } from "next/server";

import { asRecord, getString, jsonError, normalizeReviewDecision } from "@/lib/server/api";
import { hasPlatformAdminError, requirePlatformAdmin } from "@/lib/server/admin";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const reviewStatusMap: Record<string, string> = {
  APPROVED: "approved",
  REJECTED: "rejected",
  CHANGES_REQUESTED: "changes_requested",
  SUSPENDED: "suspended"
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toPublicEventReview(row: Record<string, unknown>) {
  const event = firstRelation(
    row.events as
      | {
          id?: string;
          public_code?: string;
          name?: string;
          city?: string | null;
          venue_name?: string | null;
          starts_at?: string | null;
          price_cents?: number | null;
          status?: string;
          review_status?: string;
        }
      | Array<{
          id?: string;
          public_code?: string;
          name?: string;
          city?: string | null;
          venue_name?: string | null;
          starts_at?: string | null;
          price_cents?: number | null;
          status?: string;
          review_status?: string;
        }>
      | null
  );
  const requester = firstRelation(row.users as { public_id?: string; name?: string } | { public_id?: string; name?: string }[] | null);

  return {
    id: row.id,
    event_id: row.event_id,
    target_id: row.target_id,
    status: row.status,
    reason: row.reason,
    review_note: row.review_note,
    submitted_snapshot: row.submitted_snapshot,
    requester_name: requester?.name ?? "未知提交人",
    requester_public_id: requester?.public_id ?? "GU-UNKNOWN",
    event_name: event?.name ?? "未命名活动",
    event_public_code: event?.public_code ?? "GU-EVENT",
    event_city: event?.city ?? null,
    event_venue_name: event?.venue_name ?? null,
    event_starts_at: event?.starts_at ?? null,
    event_price_cents: event?.price_cents ?? 0,
    event_status: event?.status ?? "draft",
    event_review_status: event?.review_status ?? row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function GET(request: Request) {
  const adminCheck = await requirePlatformAdmin(request);

  if (hasPlatformAdminError(adminCheck)) {
    return adminCheck.error;
  }

  const serviceSupabase = getSupabaseServiceClient();
  const { data, error } = await serviceSupabase
    .from("review_requests")
    .select("id, target_type, target_id, event_id, requester_id, status, reason, submitted_snapshot, review_note, created_at, updated_at, events(id, public_code, name, city, venue_name, starts_at, price_cents, status, review_status), users(public_id, name)")
    .eq("target_type", "event")
    .in("status", ["pending", "changes_requested"])
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({
    ok: true,
    reviews: ((data ?? []) as Record<string, unknown>[]).map(toPublicEventReview)
  });
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "admin:event-reviews",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const adminCheck = await requirePlatformAdmin(request);

  if (hasPlatformAdminError(adminCheck)) {
    return adminCheck.error;
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const reviewId = getString(body, ["review_id", "reviewId", "id"]);
  const requestedDecision = getString(body, ["status", "decision", "result"]);
  const normalizedDecision = normalizeReviewDecision(requestedDecision);
  const nextStatus = reviewStatusMap[normalizedDecision] ?? reviewStatusMap[requestedDecision.toUpperCase()];
  const reviewNote = getString(body, ["review_note", "reviewNote", "note"]);

  if (!reviewId) {
    return jsonError("缺少 review_id。");
  }

  if (!nextStatus) {
    return jsonError("审核结果必须是 approved、rejected、changes_requested 或 suspended。");
  }

  if (nextStatus !== "approved" && !reviewNote) {
    return jsonError("驳回、要求修改或暂停活动时必须填写审核备注。");
  }

  const serviceSupabase = getSupabaseServiceClient();
  const { data: current, error: currentError } = await serviceSupabase
    .from("review_requests")
    .select("id, target_type, target_id, event_id, status, reason, review_note")
    .eq("id", reviewId)
    .eq("target_type", "event")
    .single();

  if (currentError || !current?.id || !current.event_id) {
    return jsonError("找不到可审核的活动审核请求。", 404);
  }

  if (!["pending", "changes_requested"].includes(String(current.status))) {
    return jsonError("该活动审核请求当前状态不能再次处理。", 409);
  }

  const now = new Date().toISOString();
  const { data: updatedReview, error: reviewError } = await serviceSupabase
    .from("review_requests")
    .update({
      status: nextStatus,
      reviewed_by: adminCheck.appUser.id,
      reviewed_at: now,
      review_note: reviewNote || null,
      updated_at: now
    })
    .eq("id", reviewId)
    .in("status", ["pending", "changes_requested"])
    .select("id, target_id, event_id, status, review_note")
    .single();

  if (reviewError || !updatedReview?.id) {
    return jsonError(reviewError?.message ?? "活动审核请求更新失败。", 409);
  }

  const { data: updatedEvent, error: eventError } = await serviceSupabase
    .from("events")
    .update({
      review_status: nextStatus,
      updated_at: now
    })
    .eq("id", updatedReview.event_id)
    .select("id, public_code, name, review_status, status")
    .single();

  if (eventError || !updatedEvent?.id) {
    return jsonError(eventError?.message ?? "活动审核状态更新失败。", 500);
  }

  await serviceSupabase.from("audit_logs").insert({
    actor_id: adminCheck.appUser.id,
    actor_role: "admin",
    event_id: updatedEvent.id,
    target_type: "review_request",
    target_id: updatedReview.id,
    action: `event_review.${nextStatus}`,
    risk_level: nextStatus === "approved" ? "medium" : "high",
    reason: reviewNote || "Platform event review",
    before_snapshot: {
      review_request_status: current.status,
      review_note: current.review_note
    },
    after_snapshot: {
      review_request_status: updatedReview.status,
      event_review_status: updatedEvent.review_status,
      review_note: updatedReview.review_note
    },
    metadata: {
      eventPublicCode: updatedEvent.public_code,
      eventName: updatedEvent.name
    }
  });

  return NextResponse.json({
    ok: true,
    review: {
      id: updatedReview.id,
      event_id: updatedEvent.id,
      event_public_code: updatedEvent.public_code,
      event_name: updatedEvent.name,
      status: updatedReview.status,
      event_review_status: updatedEvent.review_status
    }
  });
}
