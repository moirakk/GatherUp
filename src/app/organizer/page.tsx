import Link from "next/link";
import { CalendarCheck, CircleDollarSign, MapPinned, Plus, QrCode, ServerCog } from "lucide-react";

import { LocalCreatedEventList } from "@/components/local-created-event-list";
import { MetricCard } from "@/components/metric-card";
import { getNextActions } from "@/components/next-action-card";
import type { EventSetup, GatherEvent, Registration } from "@/lib/mock-data";
import { getOrganizerDashboard } from "@/lib/organizer-data";

function getPrimaryAction(event: GatherEvent, setup: EventSetup, eventRegistrations: Registration[]) {
  return getNextActions({
    basePath: `/organizer/events/${event.id}`,
    event,
    registrations: eventRegistrations,
    setup
  })[0];
}

export default async function OrganizerPage() {
  const { eventSetups, events, organizersByEventId, registrations } = await getOrganizerDashboard();
  const activeSetups = eventSetups.filter((setup) => setup.setupStatus !== "报名已开放");
  const paymentReadyCount = eventSetups.filter((setup) => setup.paymentQrStatus === "已配置").length;
  const pendingPaymentRegistrations = registrations.filter((registration) => registration.paymentStatus === "待审核");
  const pendingPaymentCount = pendingPaymentRegistrations.length;
  const firstSetupEventId = activeSetups[0]?.eventId ?? events[0]?.id ?? "";
  const firstPaymentEventId = eventSetups.find((setup) => setup.paymentQrStatus === "已配置")?.eventId ?? events[0]?.id ?? "";
  const firstPendingPaymentEventId = pendingPaymentRegistrations[0]?.eventId ?? firstSetupEventId;
  const setupHref = firstSetupEventId ? "#setup-list" : "/organizer/events/new";
  const paymentHref = firstPaymentEventId ? `/organizer/events/${firstPaymentEventId}/finance` : "/organizer/events/new";
  const pendingPaymentHref = firstPendingPaymentEventId ? `/organizer/events/${firstPendingPaymentEventId}?panel=orders` : "/organizer/events/new";

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">组织工作台</p>
          <h1>需要处理的活动事项</h1>
          <p className="subtle">先完成活动配置、数调、地点投票和收款二维码，再开放正式报名。</p>
        </div>
        <div className="button-row">
          <Link className="button secondary" href="/dev/status">
            <ServerCog size={17} />
            后端状态
          </Link>
          <Link className="button primary" href="/organizer/events/new">
            <Plus size={17} />
            创建活动
          </Link>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="筹备中活动" value={activeSetups.length} href={setupHref} />
        <MetricCard label="已配置收款" value={`${paymentReadyCount}/${eventSetups.length}`} href={paymentHref} />
        <MetricCard label="待审核付款" value={pendingPaymentCount} href={pendingPaymentHref} />
      </section>

      <LocalCreatedEventList />

      <section className="setup-grid" id="setup-list">
        {eventSetups.length === 0 ? (
          <article className="content-card setup-card">
            <div className="section-heading">
              <div>
                <span className="tag">暂无活动</span>
                <h2>还没有可管理的活动</h2>
                <p className="event-meta compact">创建活动后，配置、收款和待办事项会出现在这里。</p>
              </div>
              <QrCode size={20} />
            </div>
            <Link className="button primary" href="/organizer/events/new">
              <Plus size={17} />
              创建活动
            </Link>
          </article>
        ) : null}

        {activeSetups.map((setup) => {
          const event = events.find((item) => item.id === setup.eventId);

          if (!event) {
            return null;
          }

          const eventRegistrations = registrations.filter((registration) => registration.eventId === event.id);
          const selectedTime = setup.surveyOptions.find((option) => option.selected);
          const selectedVenue = setup.venueOptions.find((option) => option.selected);
          const primaryAction = getPrimaryAction(event, setup, eventRegistrations);

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
              <p className="subtle">{primaryAction.description}</p>
              <div className="button-row">
                <Link className={`button ${primaryAction.urgent ? "primary" : "secondary"}`} href={primaryAction.href}>{primaryAction.label}</Link>
                <Link className="button secondary" href={`/organizer/events/${event.id}/finance`}><CircleDollarSign size={16} />财务</Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="data-table">
        <div className="table-row header">
          <span>活动</span><span>阶段</span><span>报名</span><span>待处理</span><span>操作</span>
        </div>
        {events.map((event) => {
          const setup = eventSetups.find((item) => item.eventId === event.id);
          const organizers = organizersByEventId.get(event.id) ?? [];
          const pendingPaymentCount = registrations.filter(
            (registration) => registration.eventId === event.id && registration.paymentStatus === "待审核"
          ).length;

          return (
            <div className="table-row" key={event.id}>
              <span>
                <strong>{event.name}</strong>
                <small>{event.publicCode} · {organizers.map((organizer) => organizer.publicId).join(" / ")}</small>
              </span>
              <span>{setup?.setupStatus ?? event.status}</span>
              <span>{event.registered}/{event.capacity}</span>
              <span>
                {pendingPaymentCount > 0 ? (
                  <Link className="status-badge warning" href={`/organizer/events/${event.id}?panel=orders`}>
                    {pendingPaymentCount} 笔付款
                  </Link>
                ) : (
                  <span className="status-badge neutral">无待办</span>
                )}
              </span>
              <Link className="button secondary" href={`/organizer/events/${event.id}`}>管理</Link>
            </div>
          );
        })}
      </section>
    </>
  );
}
