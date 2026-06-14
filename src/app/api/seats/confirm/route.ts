import { NextResponse } from "next/server";

import { asRecord, getString, jsonError } from "@/lib/server/api";
import { getSupabaseUserClient, readBearerToken, verifySupabaseAccessToken } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const accessToken = readBearerToken(request);
  const authUser = await verifySupabaseAccessToken(accessToken);

  if (!authUser) {
    return jsonError("请使用 Supabase 登录后再确认座位。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const seatLockId = getString(body, ["seat_lock_id", "seatLockId"]);
  const attendeeId = getString(body, ["attendee_id", "attendeeId"]);

  if (!seatLockId) {
    return jsonError("缺少 seat_lock_id。");
  }

  if (!attendeeId) {
    return jsonError("缺少 attendee_id。");
  }

  try {
    const supabase = getSupabaseUserClient(accessToken);
    const { data, error } = await supabase.rpc("confirm_seat_assignment_atomic", {
      p_seat_lock_id: seatLockId,
      p_attendee_id: attendeeId
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "SEAT_CONFIRM_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        LOCK_NOT_FOUND: 404,
        ATTENDEE_NOT_FOUND: 404,
        LOCK_EXPIRED: 409,
        SEAT_ASSIGNMENT_CONFLICT: 409,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "座位确认失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      seat_assignment_id: result.seat_assignment_id,
      seat_id: result.seat_id,
      seat_label: result.seat_label
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "座位确认接口暂时不可用。", 500);
  }
}
