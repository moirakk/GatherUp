import { NextResponse } from "next/server";

import { asRecord, getNumber, getString, isApiErrorResponse, jsonError, normalizeJsonInput, requireApiSession } from "@/lib/server/api";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const categoryMap: Record<string, string> = {
  同好活动: "community",
  校园活动: "campus",
  会议会务: "conference",
  好友聚会: "private",
  工作坊: "workshop",
  "快闪/市集": "market"
};

const templateMap: Record<string, string> = {
  基础报名: "basic_registration",
  报名收款: "payment_registration",
  选座活动: "seating",
  签到活动: "checkin",
  分时预约: "time_slot",
  记录型聚会: "record_only"
};

const feeModeMap: Record<string, string> = {
  免费活动: "free",
  收费活动: "paid",
  AA记账: "split"
};

function toIsoDateTime(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}:00+08:00`).toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mapEnum(value: string, values: Record<string, string>, fallback: string) {
  return values[value] ?? (value || fallback);
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

  const eventInput = asRecord(body.event ?? body);
  const setupInput = asRecord(body.setup);
  const rulesInput = asRecord(body.rules);
  const organizerInput = Array.isArray(body.organizers) ? asRecord(body.organizers[0]) : asRecord(body.organizer);
  const publicCode = getString(eventInput, ["publicCode", "public_code"]).toUpperCase();
  const ownerPublicId = getString(organizerInput, ["publicId", "public_id"]) || getString(body, ["owner_public_id"]);

  if (!publicCode.startsWith("GU-")) {
    return jsonError("活动公开 ID 必须以 GU- 开头。");
  }

  if (!ownerPublicId) {
    return jsonError("缺少主办方 GatherUp ID。");
  }

  if (ownerPublicId.toUpperCase() !== session.gatherUpId.toUpperCase()) {
    return jsonError("只能用当前登录账号作为活动主办方。", 403);
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { data: owner, error: ownerError } = await supabase
      .from("users")
      .select("id")
      .eq("public_id", ownerPublicId.toUpperCase())
      .single();

    if (ownerError || !owner?.id) {
      return jsonError("找不到主办方用户，请先创建或同步 GatherUp 账号。", 404);
    }

    const price = getNumber(rulesInput, ["price"], getNumber(eventInput, ["price"], 0));
    const allowMulti = rulesInput.allowMulti === true || rulesInput.allowMulti === "允许";
    const paymentCodeImg =
      getString(body, ["payment_code_img", "paymentCodeImg"]) ||
      getString(setupInput, ["payment_code_img", "paymentCodeImg", "paymentCodeUrl"]);
    const wechatGroupImg =
      getString(body, ["wechat_group_img", "wechatGroupImg"]) || getString(setupInput, ["wechat_group_img", "wechatGroupImg"]);
    const customFormConfig = normalizeJsonInput(
      body.custom_form_config ?? body.customFormConfig ?? eventInput.custom_form_config ?? eventInput.customFormConfig
    );

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        public_code: publicCode,
        organizer_id: owner.id,
        name: getString(eventInput, ["name"]) || "未命名活动",
        category: mapEnum(getString(eventInput, ["category"]), categoryMap, "community"),
        template: mapEnum(getString(eventInput, ["template"]), templateMap, "basic_registration"),
        custom_type_label: getString(eventInput, ["customTypeLabel", "custom_type_label"]) || null,
        city: getString(eventInput, ["city"]) || "待确认",
        venue_name: getString(eventInput, ["venue", "venueName", "venue_name"]) || "待确认",
        address: getString(eventInput, ["address"]) || null,
        starts_at: toIsoDateTime(getString(eventInput, ["startsAt", "starts_at"])),
        registration_deadline: toIsoDateTime(getString(eventInput, ["deadline", "registration_deadline"])),
        capacity: Math.max(1, getNumber(rulesInput, ["capacity"], getNumber(eventInput, ["capacity"], 1))),
        price_cents: Math.max(0, Math.round(price * 100)),
        description: getString(eventInput, ["description"]) || null,
        payment_instructions: getString(setupInput, ["paymentNote", "payment_note", "payment_instructions"]) || null,
        custom_form_config: customFormConfig,
        payment_code_img: paymentCodeImg || null,
        wechat_group_img: wechatGroupImg || null,
        allow_multi_person_registration: allowMulti,
        max_people_per_registration: allowMulti ? Math.max(2, getNumber(rulesInput, ["maxPeoplePerOrder"], 4)) : 1,
        order_number_prefix: getString(rulesInput, ["orderPrefix", "order_number_prefix"]) || publicCode.replace(/^GU-/, "").slice(0, 8),
        status: "draft"
      })
      .select("id, public_code")
      .single();

    if (eventError || !event) {
      return jsonError(eventError?.message ?? "活动创建失败。", 500);
    }

    await supabase.from("event_organizers").insert({
      event_id: event.id,
      user_id: owner.id,
      role: "owner"
    });

    await supabase.from("event_finance_settings").insert({
      event_id: event.id,
      fee_mode: mapEnum(getString(rulesInput, ["feeMode"]), feeModeMap, price > 0 ? "paid" : "free"),
      revenue_source: price > 0 ? "registration_orders" : "none",
      settlement_rule: getString(rulesInput, ["settlementRule", "settlement_rule"]) || null
    });

    if (paymentCodeImg) {
      await supabase.from("collection_code_versions").insert({
        event_id: event.id,
        version_number: 1,
        status: "active",
        method: getString(setupInput, ["paymentMethod", "payment_method"]) || "wechat",
        display_name: "组织者收款码",
        qr_file_url: paymentCodeImg,
        instructions: getString(setupInput, ["paymentNote", "payment_note"]) || null,
        uploaded_by: owner.id,
        active_from: new Date().toISOString()
      });
    }

    return NextResponse.json({
      ok: true,
      event_id: event.id,
      public_code: event.public_code,
      custom_form_config: customFormConfig,
      payment_code_img: paymentCodeImg || null
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "活动创建接口暂时不可用。", 500);
  }
}
