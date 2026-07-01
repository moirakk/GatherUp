import { NextResponse } from "next/server";

import { asRecord, canEditEvent, getNumber, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function toIsoDateTime(value: string) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}:00+08:00`).toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "events:update",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再编辑活动。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const name = getString(body, ["name"]);
  const city = getString(body, ["city"]);
  const venueName = getString(body, ["venue_name", "venueName", "venue"]);
  const address = getString(body, ["address"]);
  const startsAt = toIsoDateTime(getString(body, ["starts_at", "startsAt"]));
  const registrationDeadline = toIsoDateTime(getString(body, ["registration_deadline", "registrationDeadline", "deadline"]));
  const description = getString(body, ["description"]);
  const capacity = Math.round(getNumber(body, ["capacity"], 0));

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (!name || !city || !venueName || !startsAt || !registrationDeadline || capacity < 1) {
    return jsonError("请填写活动名称、城市、场地、活动时间、报名截止和有效人数上限。");
  }

  const canEdit = await canEditEvent(authContext.supabase, eventId);

  if (!canEdit) {
    return jsonError("只有活动主办或具备编辑权限的协作者可以编辑活动。", 403);
  }

  const { count, error: countError } = await authContext.supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .not("status", "in", "(cancelled,expired,refunded)");

  if (countError) {
    return jsonError(countError.message, 500);
  }

  const activeRegistrationCount = count ?? 0;

  if (capacity < activeRegistrationCount) {
    return jsonError(`人数上限不能小于当前有效报名数 ${activeRegistrationCount}。`, 409);
  }

  const { data: updatedEvent, error } = await authContext.supabase
    .from("events")
    .update({
      name,
      city,
      venue_name: venueName,
      address: address || null,
      starts_at: startsAt,
      registration_deadline: registrationDeadline,
      capacity,
      description: description || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", eventId)
    .select("id, name, city, venue_name, address, starts_at, registration_deadline, capacity, description")
    .single();

  if (error || !updatedEvent?.id) {
    return jsonError(error?.message ?? "活动编辑失败。", 500);
  }

  return NextResponse.json({
    ok: true,
    event: updatedEvent
  });
}
