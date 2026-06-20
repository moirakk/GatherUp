import { NextResponse } from "next/server";

import { asRecord, getNumber, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "waitlist:join",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再加入候补。", 401);
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

  try {
    const { data, error } = await authContext.supabase.rpc("join_waitlist_atomic", {
      p_event_id: eventId,
      p_desired_quantity: Math.max(1, getNumber(body, ["desired_quantity", "desiredQuantity", "quantity"], 1)),
      p_note: getString(body, ["note", "participant_note", "participantNote"]) || null
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "WAITLIST_JOIN_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        EVENT_NOT_FOUND: 404,
        REGISTRATION_CLOSED: 422,
        WAITLIST_CLOSED: 422,
        CAPACITY_AVAILABLE: 409,
        ALREADY_REGISTERED: 409,
        ALREADY_WAITLISTED: 409,
        WAITLIST_ALREADY_CONVERTED: 409,
        CONCURRENT_CONFLICT: 409,
        DUPLICATE_WAITLIST_ENTRY: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "加入候补失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      waitlist_entry_id: result.waitlist_entry_id,
      status: result.status,
      desired_quantity: result.desired_quantity,
      priority_position: result.priority_position,
      event_id: eventId
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "候补接口暂时不可用。", 500);
  }
}
