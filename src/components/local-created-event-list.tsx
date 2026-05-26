"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardCheck, Trash2 } from "lucide-react";

import { clearLocalCreatedEvents, readLocalCreatedEvents, type LocalCreatedEvent } from "@/lib/local-created-events";

function formatSavedAt(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "刚刚";
  }
}

function formatFee(event: LocalCreatedEvent) {
  if (event.feeMode === "免费活动") {
    return "免费";
  }

  return `${event.feeMode} · ¥${event.price}`;
}

export function LocalCreatedEventList() {
  const [events, setEvents] = useState<LocalCreatedEvent[]>([]);

  useEffect(() => {
    setEvents(readLocalCreatedEvents());
  }, []);

  if (events.length === 0) {
    return null;
  }

  function clearEvents() {
    clearLocalCreatedEvents();
    setEvents([]);
  }

  return (
    <section className="content-card local-created-events">
      <div className="section-heading">
        <div>
          <p className="eyebrow">本地发布记录</p>
          <h2>刚通过发布检查的活动</h2>
          <p className="subtle">当前原型先保存在这台浏览器；接入数据库后会写入真实活动表。</p>
        </div>
        <ClipboardCheck size={22} />
      </div>

      <div className="local-event-list">
        {events.map((event) => (
          <div className="local-event-row" key={event.id}>
            <span>
              <strong>{event.name}</strong>
              <small>{event.publicCode} · {event.category} · {event.template}</small>
            </span>
            <span>
              <strong>{event.city}</strong>
              <small>{event.venue}</small>
            </span>
            <span>
              <strong>{formatFee(event)}</strong>
              <small>{event.capacity} 人上限 · {event.seatingMode}</small>
            </span>
            <span>
              <strong>{event.setupStatus}</strong>
              <small><CalendarClock size={13} />{formatSavedAt(event.updatedAt)}</small>
            </span>
            <Link className="button secondary compact" href="/organizer/events/new">
              继续编辑
            </Link>
          </div>
        ))}
      </div>

      <div className="button-row">
        <button className="button secondary compact" type="button" onClick={clearEvents}>
          <Trash2 size={15} />
          清空本地记录
        </button>
      </div>
    </section>
  );
}
