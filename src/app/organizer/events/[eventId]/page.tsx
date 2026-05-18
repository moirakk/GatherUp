import { Download, LinkIcon } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { SeatMap } from "@/components/seat-map";
import { StatusBadge } from "@/components/status-badge";
import { getEvent, getEventRegistrations } from "@/lib/mock-data";

type OrganizerEventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function OrganizerEventPage({ params }: OrganizerEventPageProps) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  const registrations = getEventRegistrations(eventId);

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">活动管理台</p>
          <h1>{event.name}</h1>
          <p className="subtle">{event.status} · {event.city} · {event.startsAt}</p>
        </div>
        <div className="button-row">
          <button className="button secondary" type="button"><LinkIcon size={16} />复制链接</button>
          <button className="button secondary" type="button"><Download size={16} />导出</button>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="总报名" value={event.registered} />
        <MetricCard label="已付款" value={event.paid} />
        <MetricCard label="已选座" value={event.seated} />
      </section>

      <section className="workspace-grid">
        <article className="content-card">
          <div className="section-heading">
            <h2>报名与付款</h2>
            <div className="segmented"><span>报名</span><span>付款</span><span>座位</span></div>
          </div>
          <div className="data-table compact">
            <div className="table-row header">
              <span>订单</span><span>昵称</span><span>人数</span><span>付款</span><span>座位</span>
            </div>
            {registrations.map((registration) => (
              <div className="table-row" key={registration.orderNumber}>
                <span>{registration.orderNumber}</span>
                <span>{registration.nickname}</span>
                <span>{registration.quantity}</span>
                <StatusBadge>{registration.paymentStatus}</StatusBadge>
                <span>{registration.seatStatus}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card">
          <h2>座位管理</h2>
          <SeatMap />
        </article>
      </section>
    </>
  );
}
