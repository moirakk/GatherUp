import { NextResponse } from "next/server";

import {
  asRecord,
  canManageEventByAuthUserId,
  checkInStatus,
  jsonError,
  orderStatus,
  toPublicCheckInStatus,
  toPublicOrderStatus
} from "@/lib/server/api";
import { getSupabaseServiceClient, readBearerToken, verifySupabaseAccessToken } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const accessToken = readBearerToken(request);
  const authUser = await verifySupabaseAccessToken(accessToken);

  if (!authUser) {
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
    const supabase = getSupabaseServiceClient();
    const { data: registration, error: findError } = await supabase
      .from("registrations")
      .select("id, event_id, user_id, order_number, status, check_in_status")
      .eq("check_in_code", checkInCode)
      .single();

    if (findError || !registration) {
      return jsonError("核销码无效。", 404);
    }

    const canManage = await canManageEventByAuthUserId(supabase, registration.event_id, authUser.id);

    if (!canManage) {
      return jsonError("只有活动主办或现场协作者可以核销订单。", 403);
    }

    if (registration.status !== orderStatus.approved) {
      return jsonError("该订单尚未审核通过，不能核销。", 409);
    }

    if (registration.check_in_status === checkInStatus.checkedIn) {
      return jsonError("该订单已核销，不能重复签到。", 409);
    }

    if (registration.check_in_status !== checkInStatus.notArrived) {
      return jsonError("该订单当前状态不能核销。", 409);
    }

    const checkedInAt = new Date().toISOString();
    const { data: updatedRegistration, error: updateError } = await supabase
      .from("registrations")
      .update({
        check_in_status: checkInStatus.checkedIn,
        updated_at: checkedInAt
      })
      .eq("id", registration.id)
      .eq("check_in_status", checkInStatus.notArrived)
      .select("id, order_number, status, check_in_status")
      .single();

    if (updateError || !updatedRegistration) {
      return jsonError(updateError?.message ?? "核销失败，请刷新后重试。", 500);
    }

    await supabase
      .from("registration_attendees")
      .update({
        check_in_status: checkInStatus.checkedIn,
        checked_in_at: checkedInAt
      })
      .eq("registration_id", registration.id)
      .eq("check_in_status", checkInStatus.notArrived);

    return NextResponse.json({
      ok: true,
      order_id: updatedRegistration.id,
      order_number: updatedRegistration.order_number,
      status: toPublicOrderStatus(updatedRegistration.status),
      check_in_status: toPublicCheckInStatus(updatedRegistration.check_in_status)
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "核销接口暂时不可用。", 500);
  }
}
