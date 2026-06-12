export const localCreatedEventsStorageKey = "gatherup_created_events_v0_1";

export type LocalCreatedEvent = {
  id: string;
  publicCode: string;
  name: string;
  category: string;
  template: string;
  customTypeLabel: string;
  city: string;
  venue: string;
  startsAt: string;
  deadline: string;
  feeMode: string;
  price: number;
  capacity: number;
  paymentMethod: string;
  paymentCodeImg?: string;
  wechatGroupImg?: string;
  seatingMode: string;
  organizerIds: string[];
  setupStatus: "本地草稿" | "发布检查通过";
  updatedAt: string;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readStoredEvents() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const rawEvents = window.localStorage.getItem(localCreatedEventsStorageKey);
    if (!rawEvents) {
      return [];
    }

    const events = JSON.parse(rawEvents);
    return Array.isArray(events) ? (events as LocalCreatedEvent[]) : [];
  } catch {
    return [];
  }
}

export function readLocalCreatedEvents() {
  return readStoredEvents().sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
}

export function saveLocalCreatedEvent(event: LocalCreatedEvent) {
  if (!canUseLocalStorage()) {
    return;
  }

  const existingEvents = readStoredEvents();
  const nextEvents = [event, ...existingEvents.filter((item) => item.publicCode !== event.publicCode)];
  window.localStorage.setItem(localCreatedEventsStorageKey, JSON.stringify(nextEvents.slice(0, 12)));
}

export function clearLocalCreatedEvents() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(localCreatedEventsStorageKey);
}
