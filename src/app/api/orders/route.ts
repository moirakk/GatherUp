import { NextResponse } from "next/server";

import {
  asRecord,
  getNumber,
  getString,
  jsonError,
  normalizeJsonInput,
  toPublicOrderStatus
} from "@/lib/server/api";
import {
  getSupabaseServiceClient,
  getSupabaseUserClient,
  readBearerToken,
  verifySupabaseAccessToken
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function contactTypeFromValue(value: string) {
  if (value.includes("@")) return "email";
  if (/^\+?\d[\d -]{6,}$/.test(value)) return "phone";
  return "wechat";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const contactValue = getString(body, ["contact_value", "contactValue", "contact"]);
  const accessToken = readBearerToken(request);
  const authUser = await verifySupabaseAccessToken(accessToken);

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (!authUser) {
    return jsonError("请使用 Supabase 登录后再创建真实报名订单。", 401);
  }

  if (!contactValue) {
    return jsonError("缺少联系方式。");
  }

  try {
    const userClient = getSupabaseUserClient(accessToken);
    const quantity = Math.max(1, getNumber(body, ["quantity"], 1));
    const formAnswers = normalizeJsonInput(body.form_answers ?? body.formAnswers);
    const paymentScreenshotImg = getString(body, ["payment_screenshot_img", "paymentScreenshotImg"]);

    const { data, error } = await userClient.rpc("create_registration_atomic", {
      p_event_id: eventId,
      p_nickname: getString(body, ["nickname", "name"]) || authUser.email || "GatherUp 用户",
      p_contact_type: getString(body, ["contact_type", "contactType"]) || contactTypeFromValue(contactValue),
      p_contact_value: contactValue,
      p_quantity: quantity,
      p_form_answers: formAnswers,
      p_participant_note: getString(body, ["participant_note", "participantNote"]) || null
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "REGISTRATION_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        EVENT_NOT_FOUND: 404,
        REGISTRATION_CLOSED: 422,
        CAPACITY_EXCEEDED: 409,
        ALREADY_REGISTERED: 409,
        CONCURRENT_CONFLICT: 409,
        DUPLICATE_REGISTRATION: 409
      };

      return NextResponse.json(
        { ok: false, message: typeof result.message === "string" ? result.message : "报名订单创建失败。", error_code: errorCode },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    const registrationId = typeof result.registration_id === "string" ? result.registration_id : "";
    const orderNumber = typeof result.order_number === "string" ? result.order_number : "";
    const status = typeof result.status === "string" ? result.status : "";

    if (paymentScreenshotImg) {
      const serviceClient = getSupabaseServiceClient();
      const { data: appUser } = await serviceClient
        .from("users")
        .select("id")
        .eq("auth_user_id", authUser.id)
        .single();
      const { data: payment } = await serviceClient.from("payments").select("id, amount_cents").eq("registration_id", registrationId).single();

      if (appUser?.id && payment?.id) {
        await serviceClient.from("payment_proofs").insert({
          payment_id: payment.id,
          registration_id: registrationId,
          file_url: paymentScreenshotImg,
          uploaded_by: appUser.id,
          amount_reported_cents: Math.max(0, payment.amount_cents)
        });
        await serviceClient
          .from("registrations")
          .update({
            status: "payment_submitted",
            payment_screenshot_img: paymentScreenshotImg
          })
          .eq("id", registrationId)
          .eq("status", "awaiting_payment");
      }
    }

    return NextResponse.json({
      ok: true,
      order_id: registrationId,
      order_number: orderNumber,
      status: toPublicOrderStatus(paymentScreenshotImg ? "payment_submitted" : status),
      amount_due_cents: result.amount_due_cents,
      quantity: result.quantity,
      check_in_status: "NOT_ARRIVED"
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "报名接口暂时不可用。", 500);
  }
}
