import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import type { GatherEvent } from "@/lib/mock-data";
import { StatusBadge } from "@/components/status-badge";

type EventCardProps = {
  event: GatherEvent;
};

export function EventCard({ event }: EventCardProps) {
  const remaining = event.capacity - event.registered;

  return (
    <article className="event-card">
      <div className="event-card-top">
        <span className="tag">{event.customTypeLabel}</span>
        <StatusBadge>{event.status}</StatusBadge>
      </div>

      <div>
        <h3>{event.name}</h3>
        <p className="event-meta compact">
          {event.publicCode}
        </p>
        <p className="event-meta compact">
          {event.category} · {event.template}
        </p>
        <p className="event-meta">
          <CalendarDays size={15} aria-hidden="true" />
          {event.startsAt}
        </p>
        <p className="event-meta">
          <MapPin size={15} aria-hidden="true" />
          {event.city} · {event.venue}
        </p>
      </div>

      <div className="event-card-bottom">
        <div>
          <strong>¥{event.price}</strong>
          <span>剩余 {remaining} 位</span>
        </div>
        <Link className="button secondary" href={`/events/${event.id}`}>
          查看详情
        </Link>
      </div>
    </article>
  );
}
