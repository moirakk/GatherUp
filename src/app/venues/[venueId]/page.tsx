import Link from "next/link";
import { Building2, CalendarCheck, CircleDollarSign, MapPin, MessageSquareText, Star } from "lucide-react";

import { getVenue } from "@/lib/mock-data";

type VenuePageProps = {
  params: Promise<{ venueId: string }>;
};

const scoreLabels = {
  communication: "沟通效率",
  environment: "环境体验",
  setupFlexibility: "布置弹性",
  valueForMoney: "性价比"
};

export default async function VenuePage({ params }: VenuePageProps) {
  const { venueId } = await params;
  const venue = getVenue(venueId);

  return (
    <div className="detail-layout">
      <section className="hero-card">
        <div className="event-card-top">
          <span className="tag">{venue.type}</span>
          <span className={`status-badge ${venue.supportStatus === "确认可办" ? "success" : venue.supportStatus === "可能可办" ? "warning" : "neutral"}`}>
            {venue.supportStatus}
          </span>
        </div>
        <h1>{venue.name}</h1>
        <p className="subtle">{venue.organizerNotes}</p>

        <div className="fact-list">
          <span><MapPin size={16} />{venue.city} · {venue.district}</span>
          <span><Building2 size={16} />{venue.capacity}</span>
          <span><Star size={16} />{venue.rating.toFixed(1)} · {venue.reviewCount} 条经验</span>
        </div>

        <div className="metrics-grid">
          {Object.entries(venue.experienceScores).map(([key, score]) => (
            <article className="metric-card" key={key}>
              <strong>{score.toFixed(1)}</strong>
              <span>{scoreLabels[key as keyof typeof scoreLabels]}</span>
            </article>
          ))}
        </div>
      </section>

      <aside className="action-card">
        <h2>用于创建活动</h2>
        <div className="step-list">
          <div><strong>1. 先确认可办状态</strong><span>场地情报来自历史经验，正式预订前仍需组织者二次确认。</span></div>
          <div><strong>2. 带着预估人数沟通</strong><span>建议先做数调，再用预计人数和场次去谈价格。</span></div>
          <div><strong>3. 活动后补充经验</strong><span>让下一位组织者少打几个电话，也少踩一个坑。</span></div>
        </div>
        <Link className="button primary full" href="/organizer/events/new">
          用这个场地创建活动
        </Link>
      </aside>

      <section className="content-card">
        <h2>基础信息</h2>
        <dl className="info-list">
          <div><dt>地址</dt><dd>{venue.address}</dd></div>
          <div><dt>适合活动</dt><dd>{venue.suitableFor.join("、")}</dd></div>
          <div><dt>价格备注</dt><dd><CircleDollarSign size={14} /> {venue.priceNote}</dd></div>
          <div><dt>联系建议</dt><dd><MessageSquareText size={14} /> {venue.contactNote}</dd></div>
          <div><dt>最近验证</dt><dd><CalendarCheck size={14} /> {venue.lastVerified}</dd></div>
        </dl>
      </section>

      <section className="content-card">
        <h2>组织者经验</h2>
        <div className="venue-note-grid">
          <div>
            <h3>优势</h3>
            <div className="notice-list">
              {venue.highlights.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>
          <div>
            <h3>注意事项</h3>
            <div className="notice-list">
              {venue.caveats.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
