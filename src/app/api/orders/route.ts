import { NextResponse } from "next/server";

import {
  asRecord,
  checkInStatus,
  findUserByPublicId,
  generateCheckInCode,
  getNumber,
  getString,
  isApiErrorResponse,
  jsonError,
  normalizeJsonInput,
  orderStatus,
  requireApiSession,
  toPublicOrderStatus
} from "@/lib/server/api";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function contactTypeFromValue(value: string) {
  if (value.includes("@")) return "email";
  if (/^\+?\d[\d -]{6,}$/.test(value)) return "phone";
  return "wechat";
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim().toUpperCase() : "")).filter(Boolean)
    : [];
}

export async function POST(request: Request) {
  const session = requireApiSession(request);

  if (isApiErrorResponse(session)) {
    return session;
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const publicId = getString(body, ["public_id", "publicId", "gatherUpId"]);
  const contactValue = getString(body, ["contact_value", "contactValue", "contact"]);

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (publicId && publicId.toUpperCase() !== session.gatherUpId.toUpperCase()) {
    return jsonError("只能为当前登录账号创建报名订单。", 403);
  }

  if (!contactValue) {
    return jsonError("缺少联系方式。");
  }

  try {
    const supabase = getSupabaseServiceClient();
    const eventQuery = supabase
      .from("events")
      .select("id, public_code, price_cents, order_number_prefix, max_people_per_registration")
      .limit(1);
    const { data: event, error: eventError } = await (isUuid(eventId)
      ? eventQuery.eq("id", eventId).single()
      : eventQuery.eq("public_code", eventId).single());

    if (eventError || !event) {
      return jsonError("找不到活动。", 404);
    }

    const user = await findUserByPublicId(supabase, session.gatherUpId);

    if (!user?.id) {
      return jsonError("找不到报名用户，请先登录或同步 GatherUp 账号。", 404);
    }

    const quantity = Math.max(1, Math.min(getNumber(body, ["quantity"], 1), event.max_people_per_registration ?? 1));
    const { count } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id);
    const sequence = String((count ?? 0) + 1).padStart(4, "0");
    const orderPrefix = event.order_number_prefix || event.public_code.replace(/^GU-/, "").slice(0, 8);
    const orderNumber = getString(body, ["order_number", "orderNumber"]) || `${orderPrefix}-${sequence}`;
    const formAnswers = normalizeJsonInput(body.form_answers ?? body.formAnswers);
    const paymentScreenshotImg = getString(body, ["payment_screenshot_img", "paymentScreenshotImg"]);
    const checkInCode = generateCheckInCode();
    const attendeePublicIds = Array.from(new Set([user.public_id, ...getStringArray(body.attendee_ids ?? body.attendeeIds)]));

    const { data: registration, error: registrationError } = await supabase
      .from("registrations")
      .insert({
        event_id: event.id,
        user_id: user.id,
        order_number: orderNumber,
        nickname: getString(body, ["nickname", "name"]) || user.public_id,
        contact_type: getString(body, ["contact_type", "contactType"]) || contactTypeFromValue(contactValue),
        contact_value: contactValue,
        quantity,
        amount_due_cents: Math.max(0, event.price_cents * quantity),
        status: orderStatus.pending,
        registration_answers: formAnswers,
        form_answers: formAnswers,
        payment_screenshot_img: paymentScreenshotImg || null,
        check_in_code: checkInCode,
        check_in_status: checkInStatus.notArrived,
        participant_note: getString(body, ["participant_note", "participantNote"]) || null,
        accepted_terms_at: new Date().toISOString()
      })
      .select("id, event_id, order_number, status, check_in_code, check_in_status")
      .single();

    if (registrationError || !registration) {
      return jsonError(registrationError?.message ?? "报名订单创建失败。", 500);
    }

    await supabase.from("registration_attendees").insert(
      attendeePublicIds.slice(0, quantity).map((attendeePublicId, index) => ({
        registration_id: registration.id,
        user_id: attendeePublicId === user.public_id ? user.id : null,
        public_id: attendeePublicId,
        is_primary: index === 0,
        is_temporary: false,
        check_in_status: checkInStatus.notArrived
      }))
    );

    if (paymentScreenshotImg) {
      const { data: payment } = await supabase.from("payments").select("id").eq("registration_id", registration.id).single();

      if (payment?.id) {
        await supabase.from("payment_proofs").insert({
          payment_id: payment.id,
          registration_id: registration.id,
          file_url: paymentScreenshotImg,
          uploaded_by: user.id,
          amount_reported_cents: Math.max(0, event.price_cents * quantity)
        });
      }
    }

    return NextResponse.json({
      ok: true,
      order_id: registration.id,
      order_number: registration.order_number,
      status: toPublicOrderStatus(registration.status),
      check_in_code: registration.check_in_code,
      check_in_status: "NOT_ARRIVED"
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "报名接口暂时不可用。", 500);
  }
}
