import { NextResponse } from "next/server";

import { asRecord, getNumber, getString, jsonError } from "@/lib/server/api";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再申请退款。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const registrationId = getString(body, ["registration_id", "registrationId", "order_id", "orderId"]);
  const reason = getString(body, ["reason", "refund_reason", "refundReason"]);

  if (!registrationId) {
    return jsonError("缺少 registration_id。");
  }

  if (!reason) {
    return jsonError("缺少退款原因。");
  }

  try {
    const requestedAmountCents = getNumber(body, ["requested_amount_cents", "requestedAmountCents"], 0);
    const { data, error } = await authContext.supabase.rpc("request_refund_atomic", {
      p_registration_id: registrationId,
      p_requested_amount_cents: requestedAmountCents > 0 ? requestedAmountCents : null,
      p_reason: reason
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "REFUND_REQUEST_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        REGISTRATION_NOT_FOUND: 404,
        MISSING_REASON: 400,
        REFUND_UNAVAILABLE: 409,
        FREE_ORDER: 422,
        NO_CONFIRMED_PAYMENT: 409,
        REFUND_ALREADY_OPEN: 409,
        INVALID_AMOUNT: 400,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "退款申请失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      refund_request_id: result.refund_request_id,
      order_id: result.registration_id,
      order_number: result.order_number,
      requested_amount_cents: result.requested_amount_cents,
      status: result.status
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "退款申请接口暂时不可用。", 500);
  }
}
