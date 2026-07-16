import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";

import type { GatherEvent } from "@/lib/mock-data";
import { getEventVisual } from "@/lib/event-visuals";
import styles from "./event-browser.module.css";

type EventCardProps = {
  event: GatherEvent;
  featured?: boolean;
};

function getDateParts(value: string) {
  const match = value.match(/\d{4}-(\d{2})-(\d{2})\s+(.+)/);

  if (!match) {
    return { day: "--", month: "待定", time: value };
  }

  return {
    day: match[2],
    month: `${Number(match[1])}月`,
    time: `${Number(match[1])}月${Number(match[2])}日 ${match[3]}`
  };
}

export function EventCard({ event, featured = false }: EventCardProps) {
  const remaining = Math.max(event.capacity - event.registered, 0);
  const progress = Math.min(Math.round((event.registered / event.capacity) * 100), 100);
  const date = getDateParts(event.startsAt);
  const visual = getEventVisual(event.id, event.category);
  const heading = featured ? (
    <h2>{event.name}</h2>
  ) : (
    <h3>{event.name}</h3>
  );

  return (
    <article className={`${styles.card} ${featured ? styles.featuredCard : styles.compactCard}`}>
      <Link className={styles.media} href={`/events/${event.id}`} aria-label={`查看${event.name}`}>
        <Image
          alt={visual.alt}
          fill
          loading={featured ? "eager" : "lazy"}
          sizes={featured ? "(max-width: 700px) 100vw, 64vw" : "(max-width: 700px) 100vw, 184px"}
          src={visual.src}
          style={{ objectPosition: visual.position }}
        />
        <span className={styles.dateTile}>
          <strong>{date.day}</strong>
          <span>{date.month}</span>
        </span>
      </Link>

      <div className={styles.content}>
        <div className={styles.labels}>
          <span className={styles.category}>{event.customTypeLabel}</span>
          <span className={styles.status}>{event.status}</span>
        </div>
        <Link className={styles.titleLink} href={`/events/${event.id}`}>
          {heading}
        </Link>
        {featured ? <p className={styles.description}>{event.description}</p> : null}

        <div className={styles.meta}>
          <p><CalendarDays size={15} aria-hidden="true" />{date.time}</p>
          <p><MapPin size={15} aria-hidden="true" />{event.city} · {event.venue}</p>
        </div>

        {featured ? (
          <div className={styles.progress} aria-label={`报名进度 ${progress}%`}>
            <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
            <div className={styles.progressMeta}>
              <span>{event.registered} 人已报名</span>
              <span>剩余 {remaining} 位</span>
            </div>
          </div>
        ) : null}

        <div className={styles.footer}>
          <div className={styles.price}>
            <strong>{event.price === 0 ? "免费" : `¥${event.price}`}</strong>
            <span>{featured ? event.publicCode : `剩余 ${remaining} 位`}</span>
          </div>
          <Link className={styles.action} href={`/events/${event.id}`}>
            <span>查看详情</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
