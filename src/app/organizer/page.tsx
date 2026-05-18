import Link from "next/link";
import { Plus } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { events } from "@/lib/mock-data";

export default function OrganizerPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">组织工作台</p>
          <h1>需要处理的活动事项</h1>
          <p className="subtle">先处理付款审核和未选座订单，活动开始前再发布当日通知。</p>
        </div>
        <Link className="button primary" href="/organizer/events/new">
          <Plus size={17} />
          创建活动
        </Link>
      </section>

      <section className="metrics-grid">
        <MetricCard label="待审核付款" value={3} />
        <MetricCard label="未选座订单" value={8} />
        <MetricCard label="候补报名" value={2} />
      </section>

      <section className="data-table">
        <div className="table-row header">
          <span>活动</span><span>报名</span><span>付款</span><span>选座</span><span>操作</span>
        </div>
        {events.slice(0, 2).map((event) => (
          <div className="table-row" key={event.id}>
            <span>{event.name}</span>
            <span>{event.registered}/{event.capacity}</span>
            <span>{event.paid} 已付</span>
            <span>{event.seated || "未开放"}</span>
            <Link className="button secondary" href={`/organizer/events/${event.id}`}>管理</Link>
          </div>
        ))}
      </section>
    </>
  );
}
