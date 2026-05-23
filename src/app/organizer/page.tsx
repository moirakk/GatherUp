import Link from "next/link";
import { CalendarCheck, CircleDollarSign, MapPinned, Plus, QrCode } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { eventSetups, events, getEventOrganizers } from "@/lib/mock-data";

export default function OrganizerPage() {
  const activeSetups = eventSetups.filter((setup) => setup.setupStatus !== "报名已开放");
  const paymentReadyCount = eventSetups.filter((setup) => setup.paymentQrStatus === "已配置").length;

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">组织工作台</p>
          <h1>需要处理的活动事项</h1>
          <p className="subtle">先完成活动配置、数调、地点投票和收款二维码，再开放正式报名。</p>
        </div>
        <Link className="button primary" href="/organizer/events/new">
          <Plus size={17} />
          创建活动
        </Link>
      </section>

      <section className="metrics-grid">
        <MetricCard label="筹备中活动" value={activeSetups.length} />
        <MetricCard label="已配置收款" value={`${paymentReadyCount}/${eventSetups.length}`} />
        <MetricCard label="待审核付款" value={3} />
      </section>

      <section className="setup-grid">
        {eventSetups.slice(0, 3).map((setup) => {
          const event = events.find((item) => item.id === setup.eventId) ?? events[0];
          const selectedTime = setup.surveyOptions.find((option) => option.selected);
          const selectedVenue = setup.venueOptions.find((option) => option.selected);

          return (
            <article className="content-card setup-card" key={setup.eventId}>
              <div className="section-heading">
                <div>
                  <span className="tag">{setup.setupStatus}</span>
                  <h2>{event.name}</h2>
                  <p className="event-meta compact">{event.publicCode}</p>
                </div>
                <QrCode size={20} />
              </div>
              <div className="setup-checklist">
                <span className={setup.paymentQrStatus === "已配置" ? "done" : "pending"}>
                  <QrCode size={15} />收款二维码：{setup.paymentQrStatus}
                </span>
                <span className="done">
                  <CalendarCheck size={15} />数调领先：{selectedTime?.label ?? "未选择"}
                </span>
                <span className="done">
                  <MapPinned size={15} />地点领先：{selectedVenue?.label ?? "未选择"}
                </span>
              </div>
              <p className="subtle">{setup.nextAction}</p>
              <div className="button-row">
                <Link className="button secondary" href={`/organizer/events/${event.id}`}>进入管理台</Link>
                <Link className="button secondary" href={`/organizer/events/${event.id}/finance`}><CircleDollarSign size={16} />财务</Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="data-table">
        <div className="table-row header">
          <span>活动</span><span>阶段</span><span>报名</span><span>收款</span><span>操作</span>
        </div>
        {events.slice(0, 4).map((event) => {
          const setup = eventSetups.find((item) => item.eventId === event.id);
          const organizers = getEventOrganizers(event.id);

          return (
            <div className="table-row" key={event.id}>
              <span>
                <strong>{event.name}</strong>
                <small>{event.publicCode} · {organizers.map((organizer) => organizer.publicId).join(" / ")}</small>
              </span>
              <span>{setup?.setupStatus ?? event.status}</span>
              <span>{event.registered}/{event.capacity}</span>
              <span>{setup?.paymentQrStatus ?? "未配置"}</span>
              <Link className="button secondary" href={`/organizer/events/${event.id}`}>管理</Link>
            </div>
          );
        })}
      </section>
    </>
  );
}
