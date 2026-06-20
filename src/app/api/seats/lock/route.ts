import { NextResponse } from "next/server";

import { asRecord, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "seats:lock",
    limit: 60,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再选择座位。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const registrationId = getString(body, ["registration_id", "registrationId", "order_id", "orderId"]);
  const seatId = getString(body, ["seat_id", "seatId"]);

  if (!registrationId) {
    return jsonError("缺少 registration_id。");
  }

  if (!seatId) {
    return jsonError("缺少 seat_id。");
  }

  try {
    const { data, error } = await authContext.supabase.rpc("create_seat_lock_atomic", {
      p_registration_id: registrationId,
      p_seat_id: seatId
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "SEAT_LOCK_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        REGISTRATION_NOT_FOUND: 404,
        SEAT_NOT_FOUND: 404,
        REGISTRATION_NOT_CONFIRMED: 409,
        PAYMENT_NOT_CONFIRMED: 409,
        SEAT_SELECTION_UNAVAILABLE: 422,
        SEAT_SELECTION_CLOSED: 422,
        SEAT_UNAVAILABLE: 409,
        SEAT_ALREADY_ASSIGNED: 409,
        SEAT_CONFLICT: 409,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "座位锁定失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      seat_lock_id: result.seat_lock_id,
      seat_id: result.seat_id,
      seat_label: result.seat_label,
      expires_at: result.expires_at
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "座位锁定接口暂时不可用。", 500);
  }
}
