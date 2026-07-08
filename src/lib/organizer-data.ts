import {
  type EventAnnouncement,
  eventSetups,
  events,
  getEventOrganizers,
  getEventAnnouncements,
  getEventExpenses,
  getEventFinanceSetting,
  getEventFinanceSummary,
  getEventRegistrations,
  getEventSetup,
  findEvent,
  registrations,
  type EventOrganizer,
  type EventOrganizerRole,
  type EventExpense,
  type EventFinanceSetting,
  type EventFinanceSummary,
  type EventSetup,
  type ExpenseCategory,
  type ExpenseStatus,
  type GatherEvent,
  type Registration
} from "@/lib/mock-data";
import { eventRowToGatherEvent, eventRowToSetup, type EventRow } from "@/lib/events-data";
import { shouldUseMockData } from "@/lib/data-mode";
import { canManageEvent, findUserByAuthUserId } from "@/lib/server/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rowToRegistration, type RegistrationRow } from "@/lib/orders-data";

type EventOrganizerRow = {
  event_id: string;
  role: string;
  users?:
    | {
        id: string;
        public_id: string;
        name: string;
      }
    | {
        id: string;
        public_id: string;
        name: string;
      }[]
    | null;
};

type AnnouncementRow = {
  id: string;
  event_id: string;
  title: string;
  body: string;
  status: string;
  published_at: string | null;
};

type FinanceSettingRow = {
  event_id: string;
  fee_mode: string;
  currency: string;
  revenue_source: string;
  settlement_rule: string | null;
};

type ExpenseRow = {
  id: string;
  event_id: string;
  category: string;
  title: string;
  amount_cents: number;
  status: string;
  paid_by: string | null;
  users?:
    | {
        name: string;
        public_id: string;
      }
    | {
        name: string;
        public_id: string;
      }[]
    | null;
  proof_url: string | null;
  note: string | null;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  actor_role: string | null;
  target_type: string;
  action: string;
  risk_level: string;
  reason: string | null;
  before_snapshot: unknown;
  after_snapshot: unknown;
  created_at: string;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type OrganizerUser = {
  id: string;
  public_id: string;
  name: string;
};

export type OrganizerDashboardData = {
  eventSetups: EventSetup[];
  events: GatherEvent[];
  organizersByEventId: Map<string, EventOrganizer[]>;
  registrations: Registration[];
  source: "mock" | "supabase";
};

export type OrganizerEventDetailData = {
  announcements: EventAnnouncement[];
  auditLogs: EventAuditLog[];
  event: GatherEvent;
  organizers: EventOrganizer[];
  registrations: Registration[];
  setup: EventSetup;
  source: "mock" | "supabase";
};

export type EventAuditLog = {
  id: string;
  action: string;
  actorRole: string;
  afterSummary: string;
  beforeSummary: string;
  createdAt: string;
  reason: string;
  riskLevel: string;
  targetType: string;
};

export type OrganizerFinanceDetailData = {
  event: GatherEvent;
  expenses: EventExpense[];
  registrations: Registration[];
  setting: EventFinanceSetting;
  summary: EventFinanceSummary;
  source: "mock" | "supabase";
};

function mockOrganizerDashboard(): OrganizerDashboardData {
  return {
    eventSetups,
    events,
    organizersByEventId: new Map(events.map((event) => [event.id, getEventOrganizers(event.id)])),
    registrations,
    source: "mock"
  };
}

function emptySupabaseOrganizerDashboard(): OrganizerDashboardData {
  return {
    eventSetups: [],
    events: [],
    organizersByEventId: new Map(),
    registrations: [],
    source: "supabase"
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "待确认";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function announcementRowToEventAnnouncement(row: AnnouncementRow): EventAnnouncement {
  return {
    id: row.id,
    eventId: row.event_id,
    type: "报名通知",
    title: row.title,
    content: row.body,
    status: row.status === "published" ? "已发布" : "草稿",
    publishedAt: formatDateTime(row.published_at),
    audience: "全部参与者"
  };
}

function summarizeAuditSnapshot(value: unknown) {
  if (!value || (typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0)) {
    return "无";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "无法显示";
  }
}

function auditLogRowToEventAuditLog(row: AuditLogRow): EventAuditLog {
  return {
    id: row.id,
    action: row.action,
    actorRole: row.actor_role ?? "system",
    afterSummary: summarizeAuditSnapshot(row.after_snapshot),
    beforeSummary: summarizeAuditSnapshot(row.before_snapshot),
    createdAt: formatDateTime(row.created_at),
    reason: row.reason ?? "未填写原因",
    riskLevel: row.risk_level,
    targetType: row.target_type
  };
}

function mockOrganizerEventDetail(eventId: string): OrganizerEventDetailData | null {
  const event = findEvent(eventId);

  if (!event) {
    return null;
  }

  return {
    announcements: getEventAnnouncements(event.id),
    auditLogs: [],
    event,
    organizers: getEventOrganizers(event.id),
    registrations: getEventRegistrations(event.id),
    setup: getEventSetup(event.id),
    source: "mock"
  };
}

function mockOrganizerFinanceDetail(eventId: string): OrganizerFinanceDetailData | null {
  const event = findEvent(eventId);

  if (!event) {
    return null;
  }

  return {
    event,
    expenses: getEventExpenses(event.id),
    registrations: getEventRegistrations(event.id),
    setting: getEventFinanceSetting(event.id),
    summary: getEventFinanceSummary(event.id),
    source: "mock"
  };
}

function mapFeeMode(value: string): EventFinanceSetting["feeMode"] {
  const modes: Record<string, EventFinanceSetting["feeMode"]> = {
    free: "免费",
    paid: "收费",
    split: "AA记账"
  };

  return modes[value] ?? "免费";
}

function mapRevenueSource(value: string): EventFinanceSetting["revenueSource"] {
  const sources: Record<string, EventFinanceSetting["revenueSource"]> = {
    registration_orders: "报名订单",
    orders: "报名订单",
    split: "AA分摊",
    none: "无收入"
  };

  return sources[value] ?? "无收入";
}

function mapExpenseCategory(value: string): ExpenseCategory {
  const categories: Record<string, ExpenseCategory> = {
    venue: "场地费",
    materials: "物料采购",
    food: "餐饮茶歇",
    equipment: "设备租赁",
    transport: "交通快递",
    marketing: "宣传设计",
    other: "其他"
  };

  return categories[value] ?? "其他";
}

function mapExpenseStatus(value: string): ExpenseStatus {
  const statuses: Record<string, ExpenseStatus> = {
    budgeted: "预算中",
    paid: "已支付",
    reimbursable: "待报销"
  };

  return statuses[value] ?? "预算中";
}

function financeSettingRowToSetting(row: FinanceSettingRow, eventId: string): EventFinanceSetting {
  return {
    eventId,
    feeMode: mapFeeMode(row.fee_mode),
    currency: "CNY",
    revenueSource: mapRevenueSource(row.revenue_source),
    settlementRule: row.settlement_rule ?? "按活动实际收支记录核算。"
  };
}

function expenseRowToExpense(row: ExpenseRow): EventExpense {
  const paidByUser = firstRelation(row.users);

  return {
    id: row.id,
    eventId: row.event_id,
    category: mapExpenseCategory(row.category),
    title: row.title,
    amount: Math.round(row.amount_cents / 100),
    status: mapExpenseStatus(row.status),
    paidBy: paidByUser?.name ?? paidByUser?.public_id ?? "未填写",
    proof: row.proof_url ?? "pending",
    note: row.note ?? "活动支出",
    createdAt: formatDateTime(row.created_at)
  };
}

function buildFinanceSummary(registrations: Registration[], expenses: EventExpense[]): EventFinanceSummary {
  const confirmedIncome = registrations
    .filter((registration) => registration.paymentStatus === "付款已确认")
    .reduce((sum, registration) => sum + registration.amount, 0);
  const pendingIncome = registrations
    .filter((registration) => registration.paymentStatus === "待审核")
    .reduce((sum, registration) => sum + registration.amount, 0);
  const refundedIncome = registrations
    .filter((registration) => registration.paymentStatus === "已退款")
    .reduce((sum, registration) => sum + registration.amount, 0);
  const paidExpenses = expenses
    .filter((expense) => expense.status === "已支付" || expense.status === "待报销")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const budgetedExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paidPeople = registrations
    .filter((registration) => registration.paymentStatus === "付款已确认")
    .reduce((sum, registration) => sum + registration.quantity, 0);

  return {
    confirmedIncome,
    pendingIncome,
    refundedIncome,
    paidExpenses,
    budgetedExpenses,
    netBalance: confirmedIncome - budgetedExpenses,
    perPaidPersonCost: paidPeople > 0 ? Math.round((budgetedExpenses / paidPeople) * 10) / 10 : 0
  };
}

function mapOrganizerRole(role: string): EventOrganizerRole {
  const roles: Record<string, EventOrganizerRole> = {
    owner: "主办",
    cohost: "联合主办",
    finance: "财务",
    staff: "现场协作",
    viewer: "只读"
  };

  return roles[role] ?? "联合主办";
}

function organizerRowsToMap(rows: EventOrganizerRow[]) {
  const organizerMap = new Map<string, EventOrganizer[]>();

  for (const row of rows) {
    const user = firstRelation<OrganizerUser>(row.users);

    if (!user) {
      continue;
    }

    const organizers = organizerMap.get(row.event_id) ?? [];
    organizers.push({
      eventId: row.event_id,
      userId: user.id,
      publicId: user.public_id,
      name: user.name,
      role: mapOrganizerRole(row.role)
    });
    organizerMap.set(row.event_id, organizers);
  }

  return organizerMap;
}

export async function getOrganizerDashboard(): Promise<OrganizerDashboardData> {
  if (shouldUseMockData()) {
    return mockOrganizerDashboard();
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return emptySupabaseOrganizerDashboard();
    }

    const appUser = await findUserByAuthUserId(supabase, user.id);

    if (!appUser) {
      return emptySupabaseOrganizerDashboard();
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from("event_organizers")
      .select("event_id")
      .eq("user_id", appUser.id);

    if (membershipError) {
      return emptySupabaseOrganizerDashboard();
    }

    const memberEventIds = (membershipData ?? []).map((row) => row.event_id as string);
    const ownedEventsQuery = supabase
      .from("events")
      .select("id, public_code, name, category, template, custom_type_label, city, venue_name, address, starts_at, registration_deadline, price_cents, custom_form_config, payment_code_img, wechat_group_img, capacity, description, status, allow_multi_person_registration, max_people_per_registration, order_number_prefix")
      .eq("organizer_id", appUser.id)
      .order("starts_at", { ascending: true });
    const memberEventsQuery =
      memberEventIds.length > 0
        ? supabase
            .from("events")
            .select("id, public_code, name, category, template, custom_type_label, city, venue_name, address, starts_at, registration_deadline, price_cents, custom_form_config, payment_code_img, wechat_group_img, capacity, description, status, allow_multi_person_registration, max_people_per_registration, order_number_prefix")
            .in("id", memberEventIds)
            .order("starts_at", { ascending: true })
        : null;
    const [{ data: ownedEventData, error: ownedEventError }, memberEventResult] = await Promise.all([
      ownedEventsQuery,
      memberEventsQuery ?? Promise.resolve({ data: [], error: null })
    ]);

    if (ownedEventError || memberEventResult.error) {
      return emptySupabaseOrganizerDashboard();
    }

    const eventRowsById = new Map<string, EventRow>();

    for (const row of [...(ownedEventData ?? []), ...(memberEventResult.data ?? [])]) {
      eventRowsById.set(row.id as string, row as EventRow);
    }

    const eventRows = Array.from(eventRowsById.values());

    if (eventRows.length === 0) {
      return emptySupabaseOrganizerDashboard();
    }

    const eventIds = eventRows.map((event) => event.id);
    const [registrationResult, organizerResult] = await Promise.all([
      supabase
        .from("registrations")
        .select("id, event_id, order_number, nickname, quantity, amount_due_cents, status, payment_screenshot_img, form_answers, check_in_code, check_in_status, created_at")
        .in("event_id", eventIds),
      supabase
        .from("event_organizers")
        .select("event_id, role, users(id, public_id, name)")
        .in("event_id", eventIds)
    ]);

    if (registrationResult.error || organizerResult.error) {
      return emptySupabaseOrganizerDashboard();
    }

    const dashboardEvents = eventRows.map((row) => eventRowToGatherEvent(row));
    const dashboardRegistrations = ((registrationResult.data ?? []) as RegistrationRow[]).map(rowToRegistration);

    for (const event of dashboardEvents) {
      const eventRegistrations = dashboardRegistrations.filter((registration) => registration.eventId === event.id);
      event.registered = eventRegistrations.reduce((sum, registration) => sum + registration.quantity, 0);
      event.paid = eventRegistrations
        .filter((registration) => registration.paymentStatus === "付款已确认")
        .reduce((sum, registration) => sum + registration.quantity, 0);
      event.seated = eventRegistrations
        .filter((registration) => !registration.seatStatus.includes("未"))
        .reduce((sum, registration) => sum + registration.quantity, 0);
    }

    return {
      eventSetups: eventRows.map((row) => eventRowToSetup(row)),
      events: dashboardEvents,
      organizersByEventId: organizerRowsToMap((organizerResult.data ?? []) as EventOrganizerRow[]),
      registrations: dashboardRegistrations,
      source: "supabase"
    };
  } catch {
    return emptySupabaseOrganizerDashboard();
  }
}

export async function getOrganizerEventDetail(eventId: string): Promise<OrganizerEventDetailData | null> {
  if (shouldUseMockData()) {
    return mockOrganizerEventDetail(eventId);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const appUser = await findUserByAuthUserId(supabase, user.id);

    if (!appUser) {
      return null;
    }

    const eventQuery = supabase
      .from("events")
      .select("id, public_code, name, category, template, custom_type_label, city, venue_name, address, starts_at, registration_deadline, price_cents, custom_form_config, payment_code_img, wechat_group_img, capacity, description, status, allow_multi_person_registration, max_people_per_registration, order_number_prefix");
    const { data: eventData, error: eventError } = await (isUuid(eventId)
      ? eventQuery.eq("id", eventId).single()
      : eventQuery.eq("public_code", eventId).single());

    if (eventError || !eventData) {
      return null;
    }

    const eventRow = eventData as EventRow;
    const canManage = await canManageEvent(supabase, eventRow.id);

    if (!canManage) {
      return null;
    }

    const [announcementResult, registrationResult, organizerResult, auditLogResult] = await Promise.all([
      supabase
        .from("announcements")
        .select("id, event_id, title, body, status, published_at")
        .eq("event_id", eventRow.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("registrations")
        .select("id, event_id, order_number, nickname, quantity, amount_due_cents, status, payment_screenshot_img, form_answers, check_in_code, check_in_status, created_at")
        .eq("event_id", eventRow.id),
      supabase
        .from("event_organizers")
        .select("event_id, role, users(id, public_id, name)")
        .eq("event_id", eventRow.id),
      supabase
        .from("audit_logs")
        .select("id, actor_role, target_type, action, risk_level, reason, before_snapshot, after_snapshot, created_at")
        .eq("event_id", eventRow.id)
        .order("created_at", { ascending: false })
        .limit(12)
    ]);

    if (announcementResult.error || registrationResult.error || organizerResult.error || auditLogResult.error) {
      return null;
    }

    const event = eventRowToGatherEvent(eventRow);
    const eventRegistrations = ((registrationResult.data ?? []) as RegistrationRow[]).map(rowToRegistration);
    event.registered = eventRegistrations.reduce((sum, registration) => sum + registration.quantity, 0);
    event.paid = eventRegistrations
      .filter((registration) => registration.paymentStatus === "付款已确认")
      .reduce((sum, registration) => sum + registration.quantity, 0);
    event.seated = eventRegistrations
      .filter((registration) => !registration.seatStatus.includes("未"))
      .reduce((sum, registration) => sum + registration.quantity, 0);

    return {
      announcements: ((announcementResult.data ?? []) as AnnouncementRow[]).map(announcementRowToEventAnnouncement),
      auditLogs: ((auditLogResult.data ?? []) as AuditLogRow[]).map(auditLogRowToEventAuditLog),
      event,
      organizers: organizerRowsToMap((organizerResult.data ?? []) as EventOrganizerRow[]).get(eventRow.id) ?? [],
      registrations: eventRegistrations,
      setup: eventRowToSetup(eventRow),
      source: "supabase"
    };
  } catch {
    return null;
  }
}

export async function getOrganizerFinanceDetail(eventId: string): Promise<OrganizerFinanceDetailData | null> {
  if (shouldUseMockData()) {
    return mockOrganizerFinanceDetail(eventId);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const appUser = await findUserByAuthUserId(supabase, user.id);

    if (!appUser) {
      return null;
    }

    const eventQuery = supabase
      .from("events")
      .select("id, public_code, name, category, template, custom_type_label, city, venue_name, address, starts_at, registration_deadline, price_cents, custom_form_config, payment_code_img, wechat_group_img, capacity, description, status, allow_multi_person_registration, max_people_per_registration, order_number_prefix");
    const { data: eventData, error: eventError } = await (isUuid(eventId)
      ? eventQuery.eq("id", eventId).single()
      : eventQuery.eq("public_code", eventId).single());

    if (eventError || !eventData) {
      return null;
    }

    const eventRow = eventData as EventRow;
    const { data: canManageFinance, error: permissionError } = await supabase.rpc("can_manage_event_finance", {
      target_event_id: eventRow.id
    });

    if (permissionError || canManageFinance !== true) {
      return null;
    }

    const [financeSettingResult, expenseResult, registrationResult] = await Promise.all([
      supabase
        .from("event_finance_settings")
        .select("event_id, fee_mode, currency, revenue_source, settlement_rule")
        .eq("event_id", eventRow.id)
        .maybeSingle(),
      supabase
        .from("event_expenses")
        .select("id, event_id, category, title, amount_cents, status, paid_by, proof_url, note, created_at, users!event_expenses_paid_by_fkey(name, public_id)")
        .eq("event_id", eventRow.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("registrations")
        .select("id, event_id, order_number, nickname, quantity, amount_due_cents, status, payment_screenshot_img, form_answers, check_in_code, check_in_status, created_at")
        .eq("event_id", eventRow.id)
    ]);

    if (financeSettingResult.error || expenseResult.error || registrationResult.error) {
      return null;
    }

    const event = eventRowToGatherEvent(eventRow);
    const eventRegistrations = ((registrationResult.data ?? []) as RegistrationRow[]).map(rowToRegistration);
    const expenses = ((expenseResult.data ?? []) as ExpenseRow[]).map(expenseRowToExpense);
    const fallbackSetting: FinanceSettingRow = {
      event_id: eventRow.id,
      fee_mode: eventRow.price_cents > 0 ? "paid" : "free",
      currency: "CNY",
      revenue_source: eventRow.price_cents > 0 ? "registration_orders" : "none",
      settlement_rule: null
    };

    return {
      event,
      expenses,
      registrations: eventRegistrations,
      setting: financeSettingRowToSetting((financeSettingResult.data as FinanceSettingRow | null) ?? fallbackSetting, eventRow.id),
      summary: buildFinanceSummary(eventRegistrations, expenses),
      source: "supabase"
    };
  } catch {
    return null;
  }
}
