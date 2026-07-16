import { NextResponse } from "next/server";

import { asRecord, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "orders:refund-confirm",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再确认退款。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const refundRequestId = getString(body, ["refund_request_id", "refundRequestId"]);
  const decision = getString(body, ["decision", "result", "status"]).toUpperCase();
  const note = getString(body, ["note", "reason", "dispute_reason", "disputeReason"]);

  if (!refundRequestId) {
    return jsonError("缺少 refund_request_id。");
  }

  if (!["CONFIRMED", "DISPUTED"].includes(decision)) {
    return jsonError("退款确认结果必须是 CONFIRMED 或 DISPUTED。");
  }

  try {
    const { data, error } = await authContext.supabase.rpc("confirm_refund_receipt_atomic", {
      p_refund_request_id: refundRequestId,
      p_decision: decision,
      p_note: note || null
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "REFUND_CONFIRM_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        REFUND_REQUEST_NOT_FOUND: 404,
        INVALID_DECISION: 400,
        INVALID_REFUND_STATUS: 409,
        CONCURRENT_CONFLICT: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "退款确认失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      refund_request_id: result.refund_request_id,
      order_id: result.registration_id,
      order_number: result.order_number,
      status: result.status,
      registration_status: result.registration_status,
      payment_status: result.payment_status
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "退款确认接口暂时不可用。", 500);
  }
}
