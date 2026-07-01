import { NextResponse } from "next/server";

import { asRecord, canEditEvent, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "events:publish",
    limit: 20,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再开放活动报名。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  const canEdit = await canEditEvent(authContext.supabase, eventId);

  if (!canEdit) {
    return jsonError("只有活动主办或具备编辑权限的协作者可以开放报名。", 403);
  }

  const { data: updatedEvent, error } = await authContext.supabase
    .from("events")
    .update({
      status: "registration_open",
      updated_at: new Date().toISOString()
    })
    .eq("id", eventId)
    .in("status", ["draft", "interest_collecting", "registration_scheduled"])
    .select("id, public_code, status")
    .single();

  if (error || !updatedEvent?.id) {
    return jsonError(error?.message ?? "活动当前状态不允许开放报名。", 409);
  }

  return NextResponse.json({
    ok: true,
    event_id: updatedEvent.id,
    public_code: updatedEvent.public_code,
    status: updatedEvent.status
  });
}
