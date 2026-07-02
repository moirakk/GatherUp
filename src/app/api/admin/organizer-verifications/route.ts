import { NextResponse } from "next/server";

import { asRecord, findUserByAuthUserId, getString, jsonError, normalizeReviewDecision } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const reviewStatusMap: Record<string, string> = {
  APPROVED: "light_verified",
  LIGHT_VERIFIED: "light_verified",
  ENHANCED_VERIFIED: "enhanced_verified",
  REJECTED: "rejected",
  SUSPENDED: "suspended"
};

async function requirePlatformAdmin(request: Request) {
  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return { error: jsonError("请使用 Supabase 管理员账号登录。", 401) };
  }

  const { data: isAdmin, error } = await authContext.supabase.rpc("is_platform_admin");

  if (error || isAdmin !== true) {
    return { error: jsonError("只有平台管理员可以访问认证审核。", 403) };
  }

  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);

  if (!appUser?.id) {
    return { error: jsonError("找不到当前 GatherUp 管理员资料。", 404) };
  }

  return { authContext, appUser };
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toPublicVerification(row: Record<string, unknown>) {
  const applicant = firstRelation(row.users as { public_id?: string; name?: string } | { public_id?: string; name?: string }[] | null);

  return {
    id: row.id,
    user_id: row.user_id,
    applicant_name: applicant?.name ?? "未命名用户",
    applicant_public_id: applicant?.public_id ?? "GU-UNKNOWN",
    status: row.status,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    community_account: row.community_account,
    past_event_summary: row.past_event_summary,
    review_note: row.review_note,
    force_review_required: row.force_review_required === true,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function GET(request: Request) {
  const adminCheck = await requirePlatformAdmin(request);

  if (adminCheck.error) {
    return adminCheck.error;
  }

  const serviceSupabase = getSupabaseServiceClient();
  const { data, error } = await serviceSupabase
    .from("organizer_verifications")
    .select("id, user_id, status, contact_email, contact_phone, community_account, past_event_summary, review_note, force_review_required, created_at, updated_at, users(public_id, name)")
    .in("status", ["pending", "rejected"])
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({
    ok: true,
    verifications: ((data ?? []) as Record<string, unknown>[]).map(toPublicVerification)
  });
}

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "admin:organizer-verifications",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const adminCheck = await requirePlatformAdmin(request);

  if (adminCheck.error) {
    return adminCheck.error;
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const verificationId = getString(body, ["verification_id", "verificationId"]);
  const requestedDecision = getString(body, ["status", "decision", "result"]);
  const normalizedDecision = normalizeReviewDecision(requestedDecision);
  const nextStatus = reviewStatusMap[normalizedDecision] ?? reviewStatusMap[requestedDecision.toUpperCase()];
  const reviewNote = getString(body, ["review_note", "reviewNote", "note"]);

  if (!verificationId) {
    return jsonError("缺少 verification_id。");
  }

  if (!nextStatus) {
    return jsonError("审核结果必须是 approved、enhanced_verified、rejected 或 suspended。");
  }

  if ((nextStatus === "rejected" || nextStatus === "suspended") && !reviewNote) {
    return jsonError("驳回或暂停认证时必须填写审核备注。");
  }

  const serviceSupabase = getSupabaseServiceClient();
  const { data: current, error: currentError } = await serviceSupabase
    .from("organizer_verifications")
    .select("id, user_id, status, force_review_required, review_note")
    .eq("id", verificationId)
    .single();

  if (currentError || !current?.id) {
    return jsonError("找不到可审核的主办认证申请。", 404);
  }

  const { data: updated, error: updateError } = await serviceSupabase
    .from("organizer_verifications")
    .update({
      status: nextStatus,
      reviewed_by: adminCheck.appUser.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || null,
      force_review_required: false
    })
    .eq("id", verificationId)
    .select("id, user_id, status, review_note, force_review_required")
    .single();

  if (updateError || !updated?.id) {
    return jsonError(updateError?.message ?? "主办认证审核失败。", 500);
  }

  await serviceSupabase.from("audit_logs").insert({
    actor_id: adminCheck.appUser.id,
    actor_role: "admin",
    target_type: "organizer_verification",
    target_id: updated.id,
    action: `organizer_verification.${nextStatus}`,
    risk_level: nextStatus === "suspended" ? "high" : "medium",
    reason: reviewNote || "Platform organizer verification review",
    before_snapshot: {
      status: current.status,
      force_review_required: current.force_review_required,
      review_note: current.review_note
    },
    after_snapshot: {
      status: updated.status,
      force_review_required: updated.force_review_required,
      review_note: updated.review_note
    },
    metadata: {
      applicantUserId: updated.user_id
    }
  });

  return NextResponse.json({
    ok: true,
    verification: toPublicVerification(updated as Record<string, unknown>)
  });
}
