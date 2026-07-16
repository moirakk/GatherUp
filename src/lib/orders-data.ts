import { events, findRegistration, registrations, type GatherEvent, type Registration } from "@/lib/mock-data";
import { findUserByAuthUserId, toPublicCheckInStatus } from "@/lib/server/api";
import { reportDataAccessFailure, shouldUseMockData } from "@/lib/data-mode";
import { createSupabaseServerClient, getSupabaseServerClient } from "@/lib/supabase/server";

export type RegistrationRow = {
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

export type OrderAttendeeOption = {
  id: string;
  label: string;
  seatLabel?: string;
};

export type OrderSeatOption = {
  id: string;
  label: string;
  status: string;
};

type RefundProofRow = {
  amount_cents: number | null;
  file_url: string;
  uploaded_at: string;
};

type RefundRequestRow = {
  id: string;
  status: string;
  requested_amount_cents: number;
  approved_amount_cents: number | null;
  reason: string;
  organizer_note: string | null;
  paid_at: string | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  created_at: string;
  refund_proofs?: RefundProofRow[] | null;
};

export type OrderRefundSummary = {
  approvedAmount: number | null;
  confirmedAt: string | null;
  createdAt: string;
  disputedAt: string | null;
  id: string;
  paidAt: string | null;
  proofAmount: number | null;
  proofPath: string | null;
  reason: string;
  requestedAmount: number;
  reviewNote: string;
  status: string;
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
  refundRequest?: OrderRefundSummary;
  seatSelection?: {
    registrationId: string;
    attendees: OrderAttendeeOption[];
    seats: OrderSeatOption[];
  };
  source: "mock" | "supabase";
};

export type MyOrdersData = {
  registrations: Registration[];
  eventsById: Map<string, GatherEvent>;
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

export function rowToRegistration(row: RegistrationRow): Registration {
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

function rowToRefundSummary(row: RefundRequestRow): OrderRefundSummary {
  const proof = row.refund_proofs?.[0] ?? null;

  return {
    approvedAmount: row.approved_amount_cents === null ? null : Math.round(row.approved_amount_cents / 100),
    confirmedAt: row.confirmed_at ? formatDate(row.confirmed_at) : null,
    createdAt: formatDate(row.created_at),
    disputedAt: row.disputed_at ? formatDate(row.disputed_at) : null,
    id: row.id,
    paidAt: row.paid_at ? formatDate(row.paid_at) : null,
    proofAmount: proof?.amount_cents === null || proof?.amount_cents === undefined ? null : Math.round(proof.amount_cents / 100),
    proofPath: proof?.file_url ?? null,
    reason: row.reason,
    requestedAmount: Math.round(row.requested_amount_cents / 100),
    reviewNote: row.organizer_note ?? "未填写",
    status: row.status
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

function mockMyOrders(): MyOrdersData {
  return {
    registrations,
    eventsById: new Map(events.map((event) => [event.id, event])),
    source: "mock"
  };
}

function emptySupabaseMyOrders(): MyOrdersData {
  return {
    registrations: [],
    eventsById: new Map(),
    source: "supabase"
  };
}

export async function getMyOrders(): Promise<MyOrdersData> {
  if (shouldUseMockData()) {
    return mockMyOrders();
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return emptySupabaseMyOrders();
    }

    const appUser = await findUserByAuthUserId(supabase, user.id);

    if (!appUser) {
      return emptySupabaseMyOrders();
    }

    const { data: registrationData, error: registrationError } = await supabase
      .from("registrations")
      .select("id, event_id, order_number, nickname, quantity, amount_due_cents, status, payment_screenshot_img, form_answers, check_in_code, check_in_status, created_at")
      .eq("user_id", appUser.id)
      .order("created_at", { ascending: false });

    if (registrationError) {
      return emptySupabaseMyOrders();
    }

    const registrationRows = (registrationData ?? []) as RegistrationRow[];
    const eventIds = Array.from(new Set(registrationRows.map((registration) => registration.event_id)));

    if (eventIds.length === 0) {
      return emptySupabaseMyOrders();
    }

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, public_code, name, category, template, custom_type_label, city, venue_name, address, starts_at, registration_deadline, price_cents, capacity, description, status, allow_multi_person_registration, max_people_per_registration, order_number_prefix, wechat_group_img")
      .in("id", eventIds);

    if (eventError) {
      return emptySupabaseMyOrders();
    }

    return {
      registrations: registrationRows.map(rowToRegistration),
      eventsById: new Map(((eventData ?? []) as EventRow[]).map((event) => [event.id, rowToEvent(event)])),
      source: "supabase"
    };
  } catch {
    return emptySupabaseMyOrders();
  }
}

export async function getOrderDetail(orderNumber: string): Promise<OrderDetailData | null> {
  if (shouldUseMockData()) {
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
      if (registrationError && registrationError.code !== "PGRST116") {
        reportDataAccessFailure("getOrderDetail", registrationError);
      }

      return null;
    }

    const registration = rowToRegistration(registrationData as RegistrationRow);
    const { data: refundRequestData } = await supabase
      .from("refund_requests")
      .select("id, status, requested_amount_cents, approved_amount_cents, reason, organizer_note, paid_at, confirmed_at, disputed_at, created_at, refund_proofs(file_url, amount_cents, uploaded_at)")
      .eq("registration_id", registrationData.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const refundRequest = ((refundRequestData ?? []) as RefundRequestRow[]).map(rowToRefundSummary)[0];

    const { data: attendeeData } = await supabase
      .from("registration_attendees")
      .select("id, public_id, display_name")
      .eq("registration_id", registrationData.id)
      .order("is_primary", { ascending: false });
    const attendeeOptions: OrderAttendeeOption[] = (attendeeData ?? []).map((attendee) => ({
      id: attendee.id,
      label: attendee.public_id || attendee.display_name || "未命名参与人"
    }));
    registration.attendeeIds = attendeeOptions.map((attendee) => attendee.label);

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, public_code, name, category, template, custom_type_label, city, venue_name, address, starts_at, registration_deadline, price_cents, capacity, description, status, allow_multi_person_registration, max_people_per_registration, order_number_prefix, wechat_group_img")
      .eq("id", registration.eventId)
      .single();

    if (eventError || !eventData) {
      if (eventError) {
        reportDataAccessFailure("getOrderDetail", eventError);
      }

      return null;
    }

    let seatSelection: OrderDetailData["seatSelection"];

    if (registration.paymentStatus === "付款已确认") {
      const { data: seatData } = await supabase
        .from("seats")
        .select("id, display_label, status")
        .eq("event_id", registration.eventId)
        .order("row_label", { ascending: true })
        .order("seat_number", { ascending: true });
      const { data: assignmentData } = await supabase
        .from("seat_assignments")
        .select("attendee_id, seat_id")
        .eq("registration_id", registrationData.id);
      const seatById = new Map((seatData ?? []).map((seat) => [seat.id, seat.display_label]));

      for (const attendee of attendeeOptions) {
        const assignment = (assignmentData ?? []).find((item) => item.attendee_id === attendee.id);

        if (assignment?.seat_id) {
          attendee.seatLabel = seatById.get(assignment.seat_id) ?? "已选座";
        }
      }

      seatSelection = {
        registrationId: registrationData.id,
        attendees: attendeeOptions,
        seats: (seatData ?? []).map((seat) => ({
          id: seat.id,
          label: seat.display_label,
          status: seat.status
        }))
      };

      const assignedLabels = attendeeOptions.map((attendee) => attendee.seatLabel).filter(Boolean);
      registration.seatStatus = assignedLabels.length ? assignedLabels.join(", ") : "待选座/签到";
    }

    return {
      event: rowToEvent(eventData as EventRow),
      registration,
      refundRequest,
      seatSelection,
      source: "supabase"
    };
  } catch (error) {
    reportDataAccessFailure("getOrderDetail", error);

    return null;
  }
}
