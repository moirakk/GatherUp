import Link from "next/link";

import { AccountPanel } from "@/components/account-panel";
import { StatusBadge } from "@/components/status-badge";
import { getMyOrders } from "@/lib/orders-data";

export default async function MyEventsPage() {
  const { eventsById, registrations } = await getMyOrders();
  const pendingPayments = registrations.filter((registration) => registration.paymentStatus === "待审核").length;
  const pendingSeats = registrations.filter((registration) => registration.seatStatus === "待选座/签到").length;

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">我的活动</p>
          <h1>待处理事项和历史参与活动</h1>
          <p className="subtle">管理你的活动订单、账号资料和后续要处理的报名事项。</p>
        </div>
      </section>

      <section className="metrics-grid">
        <div className="metric-card"><strong>{pendingPayments}</strong><span>待审核</span></div>
        <div className="metric-card"><strong>{pendingSeats}</strong><span>待选座</span></div>
        <div className="metric-card"><strong>{registrations.length}</strong><span>历史活动</span></div>
      </section>

      <AccountPanel />

      <section className="stack">
        {registrations.length === 0 ? (
          <article className="order-card">
            <div>
              <span className="tag">暂无订单</span>
              <h3>还没有报名记录</h3>
              <p className="subtle">找到感兴趣的活动后，报名订单会出现在这里。</p>
            </div>
            <div className="order-actions">
              <Link className="button secondary" href="/">浏览活动</Link>
            </div>
          </article>
        ) : null}

        {registrations.map((registration) => {
          const event = eventsById.get(registration.eventId);

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
                <Link className="button secondary" href={`/me/orders/${registration.orderNumber}`}>查看订单</Link>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
