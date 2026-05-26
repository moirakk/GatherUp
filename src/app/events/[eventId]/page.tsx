import Link from "next/link";
import { notFound } from "next/navigation";
import { AtSign, ClipboardList, CreditCard, MapPin, TicketCheck, UsersRound } from "lucide-react";

import { EventAnnouncements } from "@/components/event-announcements";
import { EventMaterials } from "@/components/event-materials";
import { EventReminderButton } from "@/components/event-reminder-button";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { findEvent, getEventAnnouncements, getEventOrganizers, getEventSetup } from "@/lib/mock-data";

type EventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const event = findEvent(eventId);

  if (!event) {
    notFound();
  }

  const setup = getEventSetup(eventId);
  const announcements = getEventAnnouncements(eventId);
  const organizers = getEventOrganizers(eventId);
  const remaining = event.capacity - event.registered;
  const canRegister = setup.setupStatus === "报名已开放";
  const primaryAction = canRegister ? "登录并报名" : "提交数调和地点偏好";
  const primaryActionHref = `/events/${event.id}/register?step=${canRegister ? "profile" : "survey"}`;
  const actionHint = canRegister
    ? "当前活动已开放正式报名。提交报名后会生成订单号，付款确认后才可选座。"
    : "当前仍在意向收集阶段。先提交数调和地点偏好，不会占名额，也不会付款。";

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
        <h2>当前你能做什么</h2>
        <div className="participant-next-step">
          <span className="tag">{setup.setupStatus}</span>
          <strong>{primaryAction}</strong>
          <p>{actionHint}</p>
        </div>
        <Link className="button primary full" href={primaryActionHref}>
          <TicketCheck size={17} />
          {primaryAction}
        </Link>
        <EventReminderButton />
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

      <EventAnnouncements announcements={announcements} />

      <EventMaterials event={event} />
    </div>
  );
}
