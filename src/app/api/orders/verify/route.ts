import { NextResponse } from "next/server";

import {
  asRecord,
  jsonError,
  toPublicCheckInStatus,
  toPublicOrderStatus
} from "@/lib/server/api";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再核销订单。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const checkInCode = typeof body.check_in_code === "string" ? body.check_in_code.trim() : "";

  if (!checkInCode) {
    return jsonError("缺少 check_in_code。");
  }

  try {
    const { data, error } = await authContext.supabase.rpc("check_in_order_atomic", {
      p_check_in_code: checkInCode,
      p_note: typeof body.note === "string" ? body.note : null
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "CHECK_IN_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        MISSING_CHECK_IN_CODE: 400,
        CHECK_IN_CODE_NOT_FOUND: 404,
        ORDER_NOT_CONFIRMED: 409,
        ALREADY_CHECKED_IN: 409,
        INVALID_CHECK_IN_STATUS: 409,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "核销失败，请刷新后重试。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      order_id: result.registration_id,
      order_number: result.order_number,
      status: typeof result.status === "string" ? toPublicOrderStatus(result.status) : undefined,
      check_in_status: typeof result.check_in_status === "string" ? toPublicCheckInStatus(result.check_in_status) : undefined
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "核销接口暂时不可用。", 500);
  }
}
