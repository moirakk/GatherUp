import {
  eventSetups,
  events,
  getEventOrganizers,
  registrations,
  type EventOrganizer,
  type EventOrganizerRole,
  type EventSetup,
  type GatherEvent,
  type Registration
} from "@/lib/mock-data";
import { eventRowToGatherEvent, eventRowToSetup, type EventRow } from "@/lib/events-data";
import { findUserByAuthUserId } from "@/lib/server/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
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
  if (!isSupabaseConfigured()) {
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
