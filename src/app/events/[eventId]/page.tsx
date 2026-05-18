import Link from "next/link";
import { CreditCard, MapPin, TicketCheck, UsersRound } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { getEvent } from "@/lib/mock-data";

type EventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  const remaining = event.capacity - event.registered;

  return (
    <div className="detail-layout">
      <section className="hero-card">
        <div className="event-card-top">
          <span className="tag">{event.customTypeLabel}</span>
          <StatusBadge>{event.status}</StatusBadge>
        </div>
        <h1>{event.name}</h1>
        <p className="subtle">{event.description}</p>

        <div className="fact-list">
          <span><MapPin size={16} />{event.city} · {event.venue}</span>
          <span><UsersRound size={16} />剩余 {remaining} 位</span>
          <span><CreditCard size={16} />¥{event.price} / 人</span>
        </div>

        <div className="metrics-grid">
          <MetricCard label="报名人数" value={`${event.registered}/${event.capacity}`} />
          <MetricCard label="已付款" value={event.paid} />
          <MetricCard label="已选座" value={event.seated} />
        </div>
      </section>

      <aside className="action-card">
        <h2>下一步</h2>
        <div className="step-list">
          <div><strong>1. 登录并报名</strong><span>提交昵称、联系方式和同行人 ID。</span></div>
          <div><strong>2. 上传付款截图</strong><span>订单生成后等待组织者确认。</span></div>
          <div><strong>3. 付款确认后选座</strong><span>同一订单可按人数选择座位。</span></div>
        </div>
        <Link className="button primary full" href={`/events/${event.id}/register`}>
          <TicketCheck size={17} />
          立即报名
        </Link>
      </aside>

      <section className="content-card">
        <h2>活动信息</h2>
        <dl className="info-list">
          <div><dt>时间</dt><dd>{event.startsAt}</dd></div>
          <div><dt>地址</dt><dd>{event.address}</dd></div>
          <div><dt>报名截止</dt><dd>{event.deadline}</dd></div>
          <div><dt>活动场景</dt><dd>{event.category}</dd></div>
          <div><dt>流程模板</dt><dd>{event.template}</dd></div>
          <div><dt>多人报名</dt><dd>{event.allowMulti ? `支持，最多 ${event.maxPeoplePerOrder} 人` : "不支持"}</dd></div>
          <div><dt>订单编号</dt><dd>{event.orderPrefix}-0001</dd></div>
        </dl>
      </section>
    </div>
  );
}
