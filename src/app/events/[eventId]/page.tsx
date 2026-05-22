import Link from "next/link";
import { AtSign, ClipboardList, CreditCard, MapPin, TicketCheck, UsersRound } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { getEvent, getEventOrganizers, getEventSetup } from "@/lib/mock-data";

type EventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  const setup = getEventSetup(eventId);
  const organizers = getEventOrganizers(eventId);
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
          <span><AtSign size={16} />{event.publicCode}</span>
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
        <h2>参与者入口</h2>
        <div className="step-list">
          <div><strong>1. 登录后参与</strong><span>同一 GatherUp ID 仅能提交一份数调和地点投票。</span></div>
          <div><strong>2. 先数调和地点投票</strong><span>正式报名不会在筹备阶段提前开放。</span></div>
          <div><strong>3. 等组织者开放报名</strong><span>收款二维码配置完成后，才可生成订单和上传付款截图。</span></div>
        </div>
        <Link className="button primary full" href={`/events/${event.id}/register`}>
          <TicketCheck size={17} />
          登录并参与
        </Link>
        <p className="subtle guard-copy">组织者入口不会在公开活动页暴露，请从组织工作台进入对应活动。</p>
      </aside>

      <section className="content-card">
        <h2>活动信息</h2>
        <dl className="info-list">
          <div><dt>时间</dt><dd>{event.startsAt}</dd></div>
          <div><dt>地址</dt><dd>{event.address}</dd></div>
          <div><dt>报名截止</dt><dd>{event.deadline}</dd></div>
          <div><dt>活动场景</dt><dd>{event.category}</dd></div>
          <div><dt>流程模板</dt><dd>{event.template}</dd></div>
          <div><dt>活动 ID</dt><dd>{event.publicCode}</dd></div>
          <div><dt>组织者</dt><dd>{organizers.map((organizer) => `${organizer.name}（${organizer.role}）`).join("、")}</dd></div>
          <div><dt>多人报名</dt><dd>{event.allowMulti ? `支持，最多 ${event.maxPeoplePerOrder} 人` : "不支持"}</dd></div>
          <div><dt>订单编号</dt><dd>{event.orderPrefix}-0001</dd></div>
          <div><dt>当前阶段</dt><dd>{setup.setupStatus}</dd></div>
          <div><dt>收款配置</dt><dd>{setup.paymentQrStatus}</dd></div>
          <div><dt>前置流程</dt><dd><ClipboardList size={14} /> 数调、地点投票、组织者收款配置</dd></div>
        </dl>
      </section>
    </div>
  );
}
