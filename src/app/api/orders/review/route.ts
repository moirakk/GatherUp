import { NextResponse } from "next/server";

import {
  asRecord,
  canManageEventByAuthUserId,
  jsonError,
  normalizeReviewDecision,
  orderStatus,
  toPublicOrderStatus
} from "@/lib/server/api";
import { getSupabaseServiceClient, readBearerToken, verifySupabaseAccessToken } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const accessToken = readBearerToken(request);
  const authUser = await verifySupabaseAccessToken(accessToken);

  if (!authUser) {
    return jsonError("请使用 Supabase 登录后再审核付款。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  const decision = normalizeReviewDecision(body.result ?? body.review_result ?? body.status ?? body.approved);

  if (!orderId) {
    return jsonError("缺少 order_id。");
  }

  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return jsonError("审核结果必须是 APPROVED 或 REJECTED。");
  }

  try {
    const supabase = getSupabaseServiceClient();
    const nextRegistrationStatus = decision === "APPROVED" ? orderStatus.approved : orderStatus.rejected;
    const nextPaymentStatus = decision === "APPROVED" ? "confirmed" : "rejected";
    const registrationQuery = supabase.from("registrations").select("id, event_id, amount_due_cents").limit(1);
    const { data: registration, error: findError } = await (isUuid(orderId)
      ? registrationQuery.eq("id", orderId).single()
      : registrationQuery.eq("order_number", orderId).single());

    if (findError || !registration?.id) {
      return jsonError("找不到订单。", 404);
    }

    const canManage = await canManageEventByAuthUserId(supabase, registration.event_id, authUser.id);

    if (!canManage) {
      return jsonError("只有活动主办或协作者可以审核付款。", 403);
    }

    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({
        status: nextRegistrationStatus,
        confirmed_at: decision === "APPROVED" ? new Date().toISOString() : null,
        organizer_note: typeof body.review_note === "string" ? body.review_note : null
      })
      .eq("id", registration.id)
      .eq("status", orderStatus.pending)
      .select("id, order_number, status")
      .single();

    if (updateError || !updatedRegistration) {
      return jsonError(updateError?.message ?? "订单审核更新失败。", 500);
    }

    await supabase
      .from("payments")
      .update({
        status: nextPaymentStatus,
        amount_confirmed_cents: decision === "APPROVED" ? registration.amount_due_cents : 0,
        confirmed_at: decision === "APPROVED" ? new Date().toISOString() : null,
        organizer_note: typeof body.review_note === "string" ? body.review_note : null
      })
      .eq("registration_id", registration.id);

    await supabase
      .from("payment_proofs")
      .update({
        status: decision === "APPROVED" ? "confirmed" : "rejected",
        reviewed_at: new Date().toISOString(),
        review_note: typeof body.review_note === "string" ? body.review_note : null
      })
      .eq("registration_id", registration.id)
      .eq("status", "submitted");

    return NextResponse.json({
      ok: true,
      order_id: updatedRegistration.id,
      order_number: updatedRegistration.order_number,
      status: toPublicOrderStatus(updatedRegistration.status)
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "订单审核接口暂时不可用。", 500);
  }
}
