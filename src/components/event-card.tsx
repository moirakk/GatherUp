import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { GatherEvent } from "@/lib/mock-data";

type EventCardProps = {
  event: GatherEvent;
  tone?: "tone-lavender" | "tone-sage" | "tone-sand";
};

export function EventCard({ event, tone = "tone-lavender" }: EventCardProps) {
  const remaining = event.capacity - event.registered;

  return (
    <Link className={`g2-card ${tone}`} href={`/events/${event.id}`}>
      <p className="g2-card-city">{event.city} · {event.customTypeLabel}</p>
      <h3 className="g2-card-title">{event.name}</h3>
      <p className="g2-card-date">{event.startsAt} · {event.venue}</p>
      <p className="g2-card-desc">{event.description}</p>
      <p className="g2-card-meta">
        <strong>¥{event.price}</strong>
        <span>剩余 {remaining} 位</span>
        <span className="g2-badge">{event.status}</span>
      </p>
      <span className="g2-card-go" aria-hidden="true">
        <ArrowRight size={16} />
      </span>
    </Link>
  );
}
