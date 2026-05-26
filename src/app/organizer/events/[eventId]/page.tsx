import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AtSign, BellRing, CalendarCheck, CircleDollarSign, MapPinned, Megaphone, QrCode } from "lucide-react";

import { AnnouncementCenter } from "@/components/announcement-center";
import { EventIdentityPanel } from "@/components/event-identity-panel";
import { MetricCard } from "@/components/metric-card";
import { OrganizerEventActions } from "@/components/organizer-event-actions";
import { PaymentReviewTable } from "@/components/payment-review-table";
import { PollDecisionPanel } from "@/components/poll-decision-panel";
import { PromotionCenter } from "@/components/promotion-center";
import { SeatMap } from "@/components/seat-map";
import { findEvent, getEventAnnouncements, getEventOrganizers, getEventRegistrations, getEventSetup } from "@/lib/mock-data";

type OrganizerEventPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ panel?: string }>;
};

const panelIds = ["publish", "notify", "survey", "venue", "orders"] as const;
type PanelId = (typeof panelIds)[number];

function getPanelId(panel?: string): PanelId | null {
  return panelIds.includes(panel as PanelId) ? (panel as PanelId) : null;
}

export default async function OrganizerEventPage({ params, searchParams }: OrganizerEventPageProps) {
  const { eventId } = await params;
  const { panel } = await searchParams;
  const event = findEvent(eventId);

  if (!event) {
    notFound();
  }

  const announcements = getEventAnnouncements(eventId);
  const registrations = getEventRegistrations(eventId);
  const setup = getEventSetup(eventId);
  const organizers = getEventOrganizers(eventId);
  const activePanel = getPanelId(panel);
  const totalSurveyVotes = setup.surveyOptions.reduce((sum, option) => sum + option.votes, 0);
  const totalVenueVotes = setup.venueOptions.reduce((sum, option) => sum + option.votes, 0);
  const basePath = `/organizer/events/${event.id}`;

  const moduleLinks = [
    { id: "publish", label: "宣传发布", href: `${basePath}?panel=publish`, value: "入口" },
    { id: "notify", label: "通知", href: `${basePath}?panel=notify`, value: announcements.filter((item) => item.status === "已发布").length },
    { id: "survey", label: "数调反馈", href: `${basePath}?panel=survey`, value: totalSurveyVotes },
    { id: "venue", label: "地点投票", href: `${basePath}?panel=venue`, value: totalVenueVotes },
    {
      id: "orders",
      label: "待确认付款",
      href: `${basePath}?panel=orders`,
      value: registrations.filter((item) => item.paymentStatus === "待审核").length
    }
  ];

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">活动管理台</p>
          <h1>{event.name}</h1>
          <p className="subtle">{event.publicCode} · {event.status} · {event.city} · {event.startsAt}</p>
        </div>
        <div className="button-row">
          <OrganizerEventActions
            eventId={event.id}
            eventName={event.name}
            publicCode={event.publicCode}
            registrations={registrations}
            variant="header"
          />
          <Link className="button secondary" href={`/organizer/events/${event.id}/finance`}><CircleDollarSign size={16} />财务</Link>
        </div>
      </section>

      <section className="metrics-grid">
        {moduleLinks.map((item) => (
          <MetricCard href={item.href} key={item.id} label={item.label} value={item.value} />
        ))}
      </section>

      {activePanel && (
        <section className="focused-module">
          <div className="button-row">
            <Link className="button secondary" href={basePath}>
              <ArrowLeft size={16} />
              返回管理总览
            </Link>
            <Link className="button secondary" href={`${basePath}?panel=publish`}>宣传</Link>
            <Link className="button secondary" href={`${basePath}?panel=notify`}>通知</Link>
            <Link className="button secondary" href={`${basePath}?panel=survey`}>数调</Link>
            <Link className="button secondary" href={`${basePath}?panel=venue`}>地点</Link>
            <Link className="button secondary" href={`${basePath}?panel=orders`}>付款</Link>
          </div>

          {activePanel === "publish" && (
            <article className="content-card focused-card wide-focused-card">
              <div className="section-heading">
                <div>
                  <h2>发布与宣传中心</h2>
                  <p className="subtle">集中生成主办方最常用的对外入口、二维码和宣传文案。</p>
                </div>
                <Megaphone size={20} />
              </div>
              <PromotionCenter event={event} surveyVotes={totalSurveyVotes} venueVotes={totalVenueVotes} />
            </article>
          )}

          {activePanel === "notify" && (
            <article className="content-card focused-card wide-focused-card">
              <div className="section-heading">
                <div>
                  <h2>通知中心</h2>
                  <p className="subtle">发布报名、付款、选座和活动当日提醒，并复制到外部群聊。</p>
                </div>
                <BellRing size={20} />
              </div>
              <AnnouncementCenter announcements={announcements} event={event} />
            </article>
          )}

          {activePanel === "survey" && (
            <article className="content-card focused-card">
              <div className="section-heading">
                <div>
                  <h2>数调结果</h2>
                  <p className="subtle">只处理最终时间选择。选定后再回到总览继续配置报名或付款。</p>
                </div>
                <CalendarCheck size={20} />
              </div>
              <PollDecisionPanel actionLabel="设为最终时间" emptyLabel="最终时间" options={setup.surveyOptions} />
            </article>
          )}

          {activePanel === "venue" && (
            <article className="content-card focused-card">
              <div className="section-heading">
                <div>
                  <h2>地点投票</h2>
                  <p className="subtle">只处理最终地点选择。可结合场地库信息确认是否能办。</p>
                </div>
                <MapPinned size={20} />
              </div>
              <PollDecisionPanel actionLabel="设为最终地点" emptyLabel="最终地点" options={setup.venueOptions} />
            </article>
          )}

          {activePanel === "orders" && (
            <article className="content-card focused-card">
              <div className="section-heading">
                <div>
                  <h2>报名与付款</h2>
                  <p className="subtle">集中审核付款截图。通过后参与者才能进入选座。</p>
                </div>
                <div className="segmented"><span>报名</span><span>付款</span><span>座位</span></div>
              </div>
              <PaymentReviewTable registrations={registrations} />
            </article>
          )}
        </section>
      )}

      {!activePanel && (
      <section className="workspace-grid">
        <article className="content-card" id="setup">
          <div className="section-heading">
            <div>
              <h2>筹备配置</h2>
              <p className="subtle">先确认时间、地点和收款信息，再开放正式报名。</p>
            </div>
            <QrCode size={20} />
          </div>
          <dl className="summary-list">
            <div><dt>当前阶段</dt><dd>{setup.setupStatus}</dd></div>
            <div><dt>收款方式</dt><dd>{setup.paymentQrStatus} · {setup.paymentMethod}</dd></div>
            <div><dt>下一步</dt><dd>{setup.nextAction}</dd></div>
          </dl>
          <OrganizerEventActions
            eventId={event.id}
            eventName={event.name}
            publicCode={event.publicCode}
            registrations={registrations}
            variant="setup"
          />
          <Link className="button secondary" href={`${basePath}?panel=publish`}>
            <Megaphone size={16} />
            宣传发布
          </Link>
          <Link className="button secondary" href={`${basePath}?panel=notify`}>
            <BellRing size={16} />
            通知中心
          </Link>
        </article>

        <article className="content-card" id="identity">
          <div className="section-heading">
            <div>
              <h2>活动身份</h2>
              <p className="subtle">活动 ID 用于搜索、分享和现场核对；组织者 ID 用于权限绑定。</p>
            </div>
            <AtSign size={20} />
          </div>
          <EventIdentityPanel eventId={event.id} organizers={organizers} publicCode={event.publicCode} />
        </article>

        <article className="content-card" id="survey-results">
          <div className="section-heading">
            <h2>数调结果</h2>
            <CalendarCheck size={20} />
          </div>
          <PollDecisionPanel actionLabel="设为最终时间" emptyLabel="最终时间" options={setup.surveyOptions} />
        </article>

        <article className="content-card" id="venue-votes">
          <div className="section-heading">
            <h2>地点投票</h2>
            <MapPinned size={20} />
          </div>
          <PollDecisionPanel actionLabel="设为最终地点" emptyLabel="最终地点" options={setup.venueOptions} />
        </article>

        <article className="content-card" id="orders">
          <div className="section-heading">
            <h2>报名与付款</h2>
            <div className="segmented"><span>报名</span><span>付款</span><span>座位</span></div>
          </div>
          <PaymentReviewTable registrations={registrations} />
        </article>

        <article className="content-card" id="seats">
          <h2>座位管理</h2>
          <SeatMap />
        </article>
      </section>
      )}
    </>
  );
}
