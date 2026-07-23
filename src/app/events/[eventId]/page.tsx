import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, TicketCheck, UsersRound } from "lucide-react";

import { EventAnnouncements } from "@/components/event-announcements";
import { EventMaterials } from "@/components/event-materials";
import { EventReminderButton } from "@/components/event-reminder-button";
import { getPublicEventDetail } from "@/lib/events-data";

type EventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const eventDetail = await getPublicEventDetail(eventId);

  if (!eventDetail) {
    notFound();
  }

  const { announcements, event, organizers, setup } = eventDetail;
  const remaining = event.capacity - event.registered;
  const quotaPercent = event.capacity > 0 ? Math.min(Math.round((event.registered / event.capacity) * 100), 100) : 0;
  const canRegister = setup.setupStatus === "报名已开放";
  const primaryAction = canRegister ? "登录并报名" : "提交数调和地点偏好";
  const primaryActionHref = `/events/${event.id}/register?step=${canRegister ? "profile" : "survey"}`;
  const actionHint = canRegister
    ? "当前活动已开放正式报名。提交报名后会生成订单号，付款确认后才可选座。"
    : "当前仍在意向收集阶段。先提交数调和地点偏好，不会占名额，也不会付款。";

  return (
    <div className="g2-page g2-detail">
      <section className="g2-hero">
        <p className="g2-hero-tag">{event.category} · {event.customTypeLabel} · {event.status}</p>
        <h1 className="g2-hero-title">{event.name}</h1>
        <p className="g2-hero-host">
          {organizers.length > 0 ? `发起人 ${organizers.map((organizer) => organizer.name).join("、")} · ` : ""}
          编号 {event.publicCode}
        </p>
      </section>

      <section className="g2-info-card">
        <div className="g2-info-row">
          <CalendarDays size={16} aria-hidden="true" />
          <div>
            <p className="g2-info-main">{event.startsAt}</p>
            <p className="g2-info-sub">报名截止 {event.deadline}</p>
          </div>
        </div>
        <div className="g2-info-row">
          <MapPin size={16} aria-hidden="true" />
          <div>
            <p className="g2-info-main">{event.venue}</p>
            <p className="g2-info-sub">{event.city} · {event.address}</p>
          </div>
        </div>
        <div className="g2-info-row">
          <UsersRound size={16} aria-hidden="true" />
          <div>
            <p className="g2-info-main">{event.registered} / {event.capacity} 人已报名</p>
            <p className="g2-info-sub">
              {event.allowMulti ? `每单最多 ${event.maxPeoplePerOrder} 人` : "仅支持单人报名"} · {event.acceptWaitlist ? "满员可候补" : "满员即止"}
            </p>
          </div>
        </div>
      </section>

      <p className="g2-section-label">活动介绍</p>
      <p className="g2-desc">{event.description}</p>

      <p className="g2-section-label">票档</p>
      <div className="g2-tickets">
        <div className="g2-ticket tone-sand">
          <div>
            <p className="g2-ticket-name">{event.price > 0 ? "标准票 · 单人" : "免费参与"}</p>
            <p className="g2-ticket-note">{event.template} · {setup.paymentQrStatus === "已配置" ? "线上确认付款" : "无需付款"}</p>
          </div>
          <p className="g2-ticket-price"><small>¥</small>{event.price}</p>
        </div>
        {event.allowMulti && (
          <div className="g2-ticket tone-sage">
            <div>
              <p className="g2-ticket-name">多人同行</p>
              <p className="g2-ticket-note">一单最多 {event.maxPeoplePerOrder} 人，同行优先相邻安排</p>
            </div>
            <p className="g2-ticket-price"><small>¥</small>{event.price} <small>/人</small></p>
          </div>
        )}
      </div>

      <div className="g2-quota">
        <span>已报名 {event.registered}</span>
        <div className="g2-quota-bar"><span style={{ width: `${quotaPercent}%` }} /></div>
        <span>{remaining > 0 ? `余 ${remaining} 位` : event.acceptWaitlist ? "可候补" : "已满"}</span>
      </div>

      <p className="g2-section-label">活动信息</p>
      <dl className="g2-detail-facts">
        <div><dt>活动 ID</dt><dd>{event.publicCode}</dd></div>
        <div><dt>活动场景</dt><dd>{event.category}</dd></div>
        <div><dt>流程模板</dt><dd>{event.template}</dd></div>
        <div><dt>当前阶段</dt><dd>{setup.setupStatus}</dd></div>
        <div><dt>收款配置</dt><dd>{setup.paymentQrStatus}</dd></div>
        <div><dt>多人报名</dt><dd>{event.allowMulti ? `支持，最多 ${event.maxPeoplePerOrder} 人` : "不支持"}</dd></div>
        <div><dt>订单编号</dt><dd>{event.orderPrefix}-0001</dd></div>
        {organizers.length > 0 && (
          <div><dt>组织者</dt><dd>{organizers.map((organizer) => `${organizer.name}（${organizer.role}）`).join("、")}</dd></div>
        )}
      </dl>

      <EventReminderButton />
      <p className="g2-hint">{actionHint}</p>
      <p className="g2-hint">组织者入口不会在公开活动页暴露，请从组织工作台进入对应活动。</p>

      <EventAnnouncements announcements={announcements} />

      <EventMaterials event={event} />

      <div className="g2-cta-bar">
        <div>
          <p className="g2-cta-price"><small>¥</small>{event.price}{event.allowMulti ? " 起" : ""}</p>
          <p className="g2-cta-note">{event.deadline} 截止</p>
        </div>
        <Link className="g2-cta-action" href={primaryActionHref}>
          <TicketCheck size={17} aria-hidden="true" />
          {primaryAction}
        </Link>
      </div>
    </div>
  );
}
