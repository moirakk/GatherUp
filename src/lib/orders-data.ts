import { events, findRegistration, type GatherEvent, type Registration } from "@/lib/mock-data";
import { toPublicCheckInStatus } from "@/lib/server/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type RegistrationRow = {
  id: string;
  event_id: string;
  order_number: string;
  nickname: string;
  quantity: number;
  amount_due_cents: number;
  status: string;
  payment_screenshot_img: string | null;
  form_answers: unknown;
  check_in_code: string | null;
  check_in_status: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  public_code: string;
  name: string;
  category: string;
  template: string;
  custom_type_label: string | null;
  city: string;
  venue_name: string;
  address: string | null;
  starts_at: string;
  registration_deadline: string | null;
  price_cents: number;
  capacity: number;
  description: string | null;
  status: string;
  allow_multi_person_registration: boolean;
  max_people_per_registration: number;
  order_number_prefix: string | null;
  wechat_group_img: string | null;
};

export type OrderDetailData = {
  event: GatherEvent;
  registration: Registration;
  source: "mock" | "supabase";
};

function formatDate(value: string | null | undefined) {
  if (!value) return "待确认";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}

function mapPaymentStatus(status: string): Registration["paymentStatus"] {
  if (status === "confirmed") return "付款已确认";
  if (status === "payment_rejected_resubmittable") return "已驳回";
  if (status === "refunded") return "已退款";
  if (status === "awaiting_payment") return "未付款";
  return "待审核";
}

function rowToEvent(row: EventRow): GatherEvent {
  return {
    id: row.id,
    publicCode: row.public_code,
    name: row.name,
    category: "同好活动",
    template: "报名收款",
    customTypeLabel: row.custom_type_label ?? "线下活动",
    city: row.city,
    venue: row.venue_name,
    address: row.address ?? "待确认",
    startsAt: formatDate(row.starts_at),
    deadline: formatDate(row.registration_deadline),
    price: Math.round(row.price_cents / 100),
    capacity: row.capacity,
    registered: 0,
    paid: 0,
    seated: 0,
    status: row.status === "completed" ? "已结束" : "报名中",
    allowMulti: row.allow_multi_person_registration,
    maxPeoplePerOrder: row.max_people_per_registration,
    orderPrefix: row.order_number_prefix ?? row.public_code.replace(/^GU-/, "").slice(0, 8),
    wechatGroupImg: row.wechat_group_img ?? undefined,
    description: row.description ?? "活动详情由主办方补充。"
  };
}

function rowToRegistration(row: RegistrationRow): Registration {
  const paymentStatus = mapPaymentStatus(row.status);

  return {
    orderNumber: row.order_number,
    eventId: row.event_id,
    nickname: row.nickname,
    quantity: row.quantity,
    attendeeIds: [],
    amount: Math.round(row.amount_due_cents / 100),
    registrationStatus: paymentStatus === "付款已确认" ? "已确认" : "已提交",
    paymentStatus,
    seatStatus: paymentStatus === "付款已确认" ? "待选座/签到" : "未开放",
    createdAt: formatDate(row.created_at),
    confirmationEta: paymentStatus === "付款已确认" ? "已确认" : "预计 24 小时内确认",
    paymentProof: row.payment_screenshot_img ?? undefined,
    formAnswers: row.form_answers,
    checkInCode: row.check_in_code ?? undefined,
    checkInStatus: toPublicCheckInStatus(row.check_in_status),
    refundPolicy: "活动退款规则以组织者发布的信息为准。"
  };
}

function mockOrderDetail(orderNumber: string): OrderDetailData | null {
  const registration = findRegistration(orderNumber);

  if (!registration) return null;

  const event = events.find((item) => item.id === registration.eventId);

  if (!event) return null;

  return {
    event,
    registration,
    source: "mock"
  };
}

export async function getOrderDetail(orderNumber: string): Promise<OrderDetailData | null> {
  if (!isSupabaseConfigured()) {
    return mockOrderDetail(orderNumber);
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data: registrationData, error: registrationError } = await supabase
      .from("registrations")
      .select("id, event_id, order_number, nickname, quantity, amount_due_cents, status, payment_screenshot_img, form_answers, check_in_code, check_in_status, created_at")
      .eq("order_number", orderNumber)
      .single();

    if (registrationError || !registrationData) {
      return mockOrderDetail(orderNumber);
    }

    const registration = rowToRegistration(registrationData as RegistrationRow);
    const { data: attendeeData } = await supabase
      .from("registration_attendees")
      .select("public_id, display_name")
      .eq("registration_id", registrationData.id)
      .order("is_primary", { ascending: false });
    registration.attendeeIds = (attendeeData ?? []).map((attendee) => attendee.public_id || attendee.display_name || "未命名参与人");

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, public_code, name, category, template, custom_type_label, city, venue_name, address, starts_at, registration_deadline, price_cents, capacity, description, status, allow_multi_person_registration, max_people_per_registration, order_number_prefix, wechat_group_img")
      .eq("id", registration.eventId)
      .single();

    if (eventError || !eventData) {
      return mockOrderDetail(orderNumber);
    }

    return {
      event: rowToEvent(eventData as EventRow),
      registration,
      source: "supabase"
    };
  } catch {
    return mockOrderDetail(orderNumber);
  }
}
