import { NextResponse } from "next/server";

import { asRecord, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function statusForErrorCode(code: unknown) {
  const statusMap: Record<string, number> = {
    CONCURRENT_CONFLICT: 409,
    INTERNAL_ERROR: 500,
    INVALID_INVITATION_STATUS: 409,
    INVALID_RESPONSE: 400,
    INVITATION_NOT_FOUND: 404,
    UNAUTHORIZED: 401
  };

  return typeof code === "string" ? statusMap[code] ?? 500 : 500;
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "events:organizers-respond",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再处理协作者邀请。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const response = getString(body, ["response", "status", "action"]).toUpperCase();

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (!["ACCEPT", "DECLINE"].includes(response)) {
    return jsonError("协作者邀请响应必须是 ACCEPT 或 DECLINE。");
  }

  const { data, error } = await authContext.supabase.rpc("respond_event_organizer_invitation_atomic", {
    p_event_id: eventId,
    p_response: response,
    p_user_agent: request.headers.get("user-agent") ?? "unknown"
  });

  if (error) {
    return jsonError(error.message, 500);
  }

  const result = asRecord(data);

  if (result.success !== true) {
    return jsonError(
      typeof result.message === "string" ? result.message : "协作者邀请处理失败。",
      statusForErrorCode(result.error_code)
    );
  }

  return NextResponse.json({
    ok: true,
    event_id: result.event_id,
    organizer_id: result.organizer_id,
    response: result.response,
    role: result.role,
    status: result.status
  });
}
