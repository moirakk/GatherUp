import { SlidersHorizontal } from "lucide-react";

import { EventCard } from "@/components/event-card";
import { events } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">活动广场</p>
          <h1>找到正在招募的线下活动</h1>
          <p className="subtle">公开活动会出现在这里。报名、付款、选座和通知都会保存在同一个订单里。</p>
        </div>
      </section>

      <section className="filter-bar" aria-label="活动筛选">
        <label className="search-field">
          <span>⌕</span>
          <input placeholder="搜索活动、城市或场地" />
        </label>
        <button className="chip active" type="button">全部城市</button>
        <button className="chip" type="button">线下观影</button>
        <button className="chip" type="button">生咖</button>
        <button className="chip icon-chip" type="button">
          <SlidersHorizontal size={15} />
          筛选
        </button>
      </section>

      <section className="event-grid">
        {events.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
      </section>
    </>
  );
}
