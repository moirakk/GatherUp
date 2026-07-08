import { NextResponse } from "next/server";

import { asRecord, findUserByAuthUserId, getNumber, getString, jsonError, orderStatus } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedUser, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeStoragePath(value: string) {
  return value.replace(/^\/+/, "").replace(/^payment-proofs\//, "");
}

function pathMatchesProof(path: string, eventId: string, registrationId: string, paymentId: string) {
  const parts = path.split("/");

  return (
    parts.length >= 4 &&
    parts[0] === eventId &&
    parts[1] === registrationId &&
    parts[2] === paymentId &&
    Boolean(parts[3])
  );
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "orders:payment-proof",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authUser = await getAuthenticatedUser(request);

  if (!authUser) {
    return jsonError("请使用 Supabase 登录后再提交付款截图。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const registrationId = getString(body, ["registration_id", "registrationId", "order_id", "orderId"]);
  const paymentId = getString(body, ["payment_id", "paymentId"]);
  const storagePath = normalizeStoragePath(getString(body, ["storage_path", "storagePath", "file_url", "fileUrl"]));

  if (!registrationId) {
    return jsonError("缺少 registration_id。");
  }

  if (!paymentId) {
    return jsonError("缺少 payment_id。");
  }

  if (!storagePath) {
    return jsonError("缺少付款截图存储路径。");
  }

  try {
    const supabase = getSupabaseServiceClient();
    const appUser = await findUserByAuthUserId(supabase, authUser.id);

    if (!appUser) {
      return jsonError("找不到当前登录用户。", 401);
    }

    const { data: registration, error: registrationError } = await supabase
      .from("registrations")
      .select("id, event_id, order_number, status, amount_due_cents, user_id")
      .eq("id", registrationId)
      .single();

    if (registrationError || !registration?.id) {
      return jsonError("找不到报名订单。", 404);
    }

    if (registration.user_id !== appUser.id) {
      return jsonError("只能为自己的订单提交付款截图。", 403);
    }

    if (!["awaiting_payment", orderStatus.rejected, "partial_paid_needs_topup"].includes(registration.status)) {
      return jsonError("当前订单状态不允许提交付款截图。", 409);
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, registration_id, amount_cents")
      .eq("id", paymentId)
      .eq("registration_id", registration.id)
      .single();

    if (paymentError || !payment?.id) {
      return jsonError("找不到订单对应的付款记录。", 404);
    }

    if (!pathMatchesProof(storagePath, registration.event_id, registration.id, payment.id)) {
      return jsonError("付款截图路径与订单不匹配。", 400);
    }

    const { data: storedObject, error: storedObjectError } = await supabase
      .schema("storage")
      .from("objects")
      .select("id")
      .eq("bucket_id", "payment-proofs")
      .eq("name", storagePath)
      .maybeSingle();

    if (storedObjectError || !storedObject?.id) {
      return jsonError("找不到已上传的付款截图文件。", 404);
    }

    const amountReportedCents = Math.max(0, getNumber(body, ["amount_reported_cents", "amountReportedCents"], payment.amount_cents));
    const { error: proofError } = await supabase.from("payment_proofs").insert({
      payment_id: payment.id,
      registration_id: registration.id,
      file_url: storagePath,
      uploaded_by: appUser.id,
      amount_reported_cents: amountReportedCents
    });

    if (proofError) {
      return jsonError(proofError.message, 500);
    }

    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({
        status: orderStatus.pending,
        payment_screenshot_img: storagePath
      })
      .eq("id", registration.id)
      .in("status", ["awaiting_payment", orderStatus.rejected, "partial_paid_needs_topup"])
      .select("id, order_number, status")
      .single();

    if (updateError || !updatedRegistration?.id) {
      return jsonError(updateError?.message ?? "付款截图已保存，但订单状态更新失败。", 500);
    }

    return NextResponse.json({
      ok: true,
      order_id: updatedRegistration.id,
      order_number: updatedRegistration.order_number,
      status: "PENDING_REVIEW",
      storage_path: storagePath
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "付款截图提交接口暂时不可用。", 500);
  }
}
