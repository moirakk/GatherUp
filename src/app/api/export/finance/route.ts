import { canManageEventByAuthUserId, jsonError } from "@/lib/server/api";
import { buildWorkbookBuffer, excelResponse } from "@/lib/server/excel";
import { getSupabaseServiceClient, readBearerToken, verifySupabaseAccessToken } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: Request) {
  const accessToken = readBearerToken(request);
  const authUser = await verifySupabaseAccessToken(accessToken);

  if (!authUser) {
    return jsonError("请使用 Supabase 登录后再导出财务对账单。", 401);
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
      .select("id, public_code, name, price_cents, currency")
      .limit(1);
    const { data: event, error: eventError } = await (isUuid(eventId)
      ? eventQuery.eq("id", eventId).single()
      : eventQuery.eq("public_code", eventId).single());

    if (eventError || !event) {
      return jsonError("找不到活动。", 404);
    }

    const canManage = await canManageEventByAuthUserId(supabase, event.id, authUser.id);

    if (!canManage) {
      return jsonError("只有活动主办或财务协作者可以导出财务对账单。", 403);
    }

    const { data: registrations, error: registrationError } = await supabase
      .from("registrations")
      .select("id, order_number, nickname, quantity, amount_due_cents, status, payment_screenshot_img, created_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });

    if (registrationError) {
      return jsonError(registrationError.message, 500);
    }

    const registrationRows = registrations ?? [];
    const registrationIds = registrationRows.map((registration) => registration.id);
    const { data: payments } = registrationIds.length
      ? await supabase
          .from("payments")
          .select("registration_id, status, amount_cents, amount_confirmed_cents, amount_reported_cents, amount_difference_cents, proof_url, submitted_at, confirmed_at")
          .in("registration_id", registrationIds)
      : { data: [] };
    const paymentsByRegistration = new Map((payments ?? []).map((payment) => [payment.registration_id, payment]));

    const buffer = await buildWorkbookBuffer(
      "finance",
      ["订单号", "昵称", "人数", "应收", "订单状态", "付款状态", "已确认", "用户上报", "差额", "付款截图", "提交时间", "确认时间"],
      registrationRows.map((registration) => {
        const payment = paymentsByRegistration.get(registration.id);

        return [
          registration.order_number,
          registration.nickname,
          registration.quantity,
          registration.amount_due_cents / 100,
          registration.status,
          payment?.status ?? "unpaid",
          (payment?.amount_confirmed_cents ?? 0) / 100,
          payment?.amount_reported_cents == null ? "" : payment.amount_reported_cents / 100,
          (payment?.amount_difference_cents ?? 0) / 100,
          payment?.proof_url ?? registration.payment_screenshot_img,
          payment?.submitted_at ?? "",
          payment?.confirmed_at ?? ""
        ];
      })
    );

    return excelResponse(buffer, `${event.public_code}-finance.xlsx`);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "导出财务对账单失败。", 500);
  }
}
