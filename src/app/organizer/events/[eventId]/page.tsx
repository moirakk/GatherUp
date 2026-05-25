import Link from "next/link";
import { AtSign, CalendarCheck, CircleDollarSign, MapPinned, QrCode } from "lucide-react";

import { EventIdentityPanel } from "@/components/event-identity-panel";
import { MetricCard } from "@/components/metric-card";
import { OrganizerEventActions } from "@/components/organizer-event-actions";
import { PaymentReviewTable } from "@/components/payment-review-table";
import { PollDecisionPanel } from "@/components/poll-decision-panel";
import { SeatMap } from "@/components/seat-map";
import { getEvent, getEventOrganizers, getEventRegistrations, getEventSetup } from "@/lib/mock-data";

type OrganizerEventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function OrganizerEventPage({ params }: OrganizerEventPageProps) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  const registrations = getEventRegistrations(eventId);
  const setup = getEventSetup(eventId);
  const organizers = getEventOrganizers(eventId);
  const totalSurveyVotes = setup.surveyOptions.reduce((sum, option) => sum + option.votes, 0);
  const totalVenueVotes = setup.venueOptions.reduce((sum, option) => sum + option.votes, 0);

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
        <MetricCard label="数调反馈" value={totalSurveyVotes} href="#survey-results" />
        <MetricCard label="地点投票" value={totalVenueVotes} href="#venue-votes" />
        <MetricCard
          label="待确认付款"
          value={registrations.filter((item) => item.paymentStatus === "待审核").length}
          href="#orders"
        />
      </section>

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
    </>
  );
}
