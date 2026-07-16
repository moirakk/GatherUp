import Link from "next/link";
import { CalendarDays, Coffee, Film, GraduationCap, MapPin, Presentation, Utensils } from "lucide-react";

import type { GatherEvent } from "@/lib/mock-data";
import { StatusBadge } from "@/components/status-badge";

type EventCardProps = {
  event: GatherEvent;
};

export function EventCard({ event }: EventCardProps) {
  const remaining = event.capacity - event.registered;
  const CategoryIcon = event.category === "校园活动"
    ? GraduationCap
    : event.category === "会议会务"
      ? Presentation
      : event.category === "好友聚会"
        ? Utensils
        : event.customTypeLabel.includes("咖")
          ? Coffee
          : Film;

  return (
    <article className="event-card discovery-event-card">
      <div className="event-card-visual" data-category={event.category}>
        <div>
          <CategoryIcon size={26} aria-hidden="true" />
          <span>{event.customTypeLabel}</span>
        </div>
        <StatusBadge>{event.status}</StatusBadge>
      </div>

      <div className="event-card-content">
        <p className="event-kicker">{event.city} · {event.template}</p>
        <h3>{event.name}</h3>
        <p className="event-meta compact">
          {event.publicCode}
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

      <div className="event-card-bottom event-card-cta">
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
