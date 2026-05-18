import Link from "next/link";
import { ClipboardList, CreditCard, MapPin, TicketCheck, UserRoundCog, UsersRound } from "lucide-react";

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
        <h2>进入活动</h2>
        <div className="step-list">
          <div><strong>1. 先确认身份</strong><span>组织者配置活动；参与者登录后继续。</span></div>
          <div><strong>2. 参与数调和地点投票</strong><span>先确定时间和场地，再进入正式报名。</span></div>
          <div><strong>3. 报名付款与确认</strong><span>组织者已配置收款二维码后，参与者上传付款截图。</span></div>
        </div>
        <Link className="button primary full" href={`/events/${event.id}/register`}>
          <TicketCheck size={17} />
          我是参与者
        </Link>
        <Link className="button secondary full" href="/organizer/events/new">
          <UserRoundCog size={17} />
          我是组织者
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
          <div><dt>前置流程</dt><dd><ClipboardList size={14} /> 数调、地点投票、组织者收款配置</dd></div>
        </dl>
      </section>
    </div>
  );
}
