import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { events, registrations } from "@/lib/mock-data";

export default function MyEventsPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">我的活动</p>
          <h1>待处理事项和历史参与活动</h1>
          <p className="subtle">GatherUp ID：GU-MIKI · 公开 ID 剩余修改次数 2</p>
        </div>
      </section>

      <section className="metrics-grid">
        <div className="metric-card"><strong>1</strong><span>待审核</span></div>
        <div className="metric-card"><strong>1</strong><span>待选座</span></div>
        <div className="metric-card"><strong>4</strong><span>历史活动</span></div>
      </section>

      <section className="stack">
        {registrations.map((registration) => {
          const event = events.find((item) => item.id === registration.eventId);

          return (
            <article className="order-card" key={registration.orderNumber}>
              <div>
                <span className="tag">{registration.orderNumber}</span>
                <h3>{event?.name}</h3>
                <p className="subtle">
                  {registration.quantity} 人 · ¥{registration.amount} · {registration.seatStatus}
                </p>
              </div>
              <div className="order-actions">
                <StatusBadge>{registration.paymentStatus}</StatusBadge>
                <Link className="button secondary" href={`/events/${registration.eventId}`}>查看订单</Link>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
