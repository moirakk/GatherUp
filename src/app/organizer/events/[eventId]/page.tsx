import Link from "next/link";
import { AtSign, CalendarCheck, CircleDollarSign, Download, LinkIcon, MapPinned, QrCode, UsersRound } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { SeatMap } from "@/components/seat-map";
import { StatusBadge } from "@/components/status-badge";
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
          <button className="button secondary" type="button"><LinkIcon size={16} />复制链接</button>
          <Link className="button secondary" href={`/organizer/events/${event.id}/finance`}><CircleDollarSign size={16} />财务</Link>
          <button className="button secondary" type="button"><Download size={16} />导出</button>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="数调反馈" value={totalSurveyVotes} />
        <MetricCard label="地点投票" value={totalVenueVotes} />
        <MetricCard label="待确认付款" value={registrations.filter((item) => item.paymentStatus === "待审核").length} />
      </section>

      <section className="workspace-grid">
        <article className="content-card">
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
          <div className="button-row">
            <button className="button primary" type="button"><QrCode size={16} />更新收款码</button>
            <button className="button secondary" type="button"><LinkIcon size={16} />开放报名链接</button>
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <h2>活动身份</h2>
              <p className="subtle">活动 ID 用于搜索、分享和现场核对；组织者 ID 用于权限绑定。</p>
            </div>
            <AtSign size={20} />
          </div>
          <dl className="summary-list">
            <div><dt>活动 ID</dt><dd>{event.publicCode}</dd></div>
            <div><dt>公开链接</dt><dd>/events/{event.id}</dd></div>
          </dl>
          <div className="organizer-list">
            {organizers.map((organizer) => (
              <div className="result-row" key={`${organizer.eventId}-${organizer.publicId}`}>
                <span><UsersRound size={15} />{organizer.name} · {organizer.publicId}</span>
                <strong>{organizer.role}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <h2>数调结果</h2>
            <CalendarCheck size={20} />
          </div>
          <div className="result-list">
            {setup.surveyOptions.map((option) => (
              <div className={option.selected ? "result-row selected" : "result-row"} key={option.label}>
                <span>{option.label}</span>
                <strong>{option.votes} 票</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <h2>地点投票</h2>
            <MapPinned size={20} />
          </div>
          <div className="result-list">
            {setup.venueOptions.map((option) => (
              <div className={option.selected ? "result-row selected" : "result-row"} key={option.label}>
                <span>{option.label}</span>
                <strong>{option.votes} 票</strong>
              </div>
            ))}
          </div>
        </article>

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
