import { canManageEventByAuthUserId, jsonError } from "@/lib/server/api";
import { buildWorkbookBuffer, excelResponse } from "@/lib/server/excel";
import { getAuthenticatedUser, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request);

  if (!authUser) {
    return jsonError("请使用 Supabase 登录后再导出名单。", 401);
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id") || searchParams.get("eventId");

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  try {
    const supabase = getSupabaseServiceClient();
    const eventQuery = supabase
      .from("events")
      .select("id, public_code, name")
      .limit(1);
    const { data: event, error: eventError } = await (isUuid(eventId)
      ? eventQuery.eq("id", eventId).single()
      : eventQuery.eq("public_code", eventId).single());

    if (eventError || !event) {
      return jsonError("找不到活动。", 404);
    }

    const canManage = await canManageEventByAuthUserId(supabase, event.id, authUser.id);

    if (!canManage) {
      return jsonError("只有活动主办或协作者可以导出名单。", 403);
    }

    const { data: registrations, error: registrationError } = await supabase
      .from("registrations")
      .select("id, order_number, nickname, contact_type, contact_value, quantity, status, check_in_status, check_in_code, form_answers, payment_screenshot_img, created_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });

    if (registrationError) {
      return jsonError(registrationError.message, 500);
    }

    const registrationRows = registrations ?? [];
    const registrationIds = registrationRows.map((registration) => registration.id);
    const { data: attendees } = registrationIds.length
      ? await supabase
          .from("registration_attendees")
          .select("registration_id, public_id, display_name, is_primary, check_in_status, checked_in_at")
          .in("registration_id", registrationIds)
      : { data: [] };
    const attendeesByRegistration = new Map<string, string>();

    for (const attendee of attendees ?? []) {
      const label = attendee.public_id || attendee.display_name || "未命名参与人";
      const current = attendeesByRegistration.get(attendee.registration_id) || "";
      attendeesByRegistration.set(attendee.registration_id, current ? `${current}; ${label}` : label);
    }

    const buffer = await buildWorkbookBuffer(
      "attendees",
      ["订单号", "昵称", "联系方式", "人数", "订单状态", "签到状态", "参与人", "表单答案", "付款截图", "核销码", "创建时间"],
      registrationRows.map((registration) => [
        registration.order_number,
        registration.nickname,
        `${registration.contact_type}:${registration.contact_value}`,
        registration.quantity,
        registration.status,
        registration.check_in_status,
        attendeesByRegistration.get(registration.id) || "",
        JSON.stringify(registration.form_answers ?? {}),
        registration.payment_screenshot_img,
        registration.check_in_code,
        registration.created_at
      ])
    );

    return excelResponse(buffer, `${event.public_code}-attendees.xlsx`);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "导出名单失败。", 500);
  }
}
