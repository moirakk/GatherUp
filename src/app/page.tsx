"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { EventCard } from "@/components/event-card";
import { type EventCategory, events } from "@/lib/mock-data";

const categoryFilters = ["全部", "同好活动", "校园活动", "会议会务", "好友聚会"] as const;

export default function HomePage() {
  const [categoryFilter, setCategoryFilter] = useState<"全部" | EventCategory>("全部");
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesCategory = categoryFilter === "全部" || event.category === categoryFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [event.name, event.city, event.venue, event.category, event.customTypeLabel, event.template]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [query, categoryFilter]);

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
          <input
            placeholder="搜索活动、城市或场地"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {categoryFilters.map((category) => (
          <button
            aria-pressed={categoryFilter === category}
            className={`chip ${categoryFilter === category ? "active" : ""}`}
            key={category}
            type="button"
            onClick={() => setCategoryFilter(category)}
          >
            {category === "全部" ? "全部活动" : category}
          </button>
        ))}
        <button className="chip icon-chip" type="button">
          <SlidersHorizontal size={15} />
          筛选
        </button>
      </section>

      {filteredEvents.length > 0 ? (
        <section className="event-grid">
          {filteredEvents.map((event) => (
          <EventCard event={event} key={event.id} />
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <strong>没有找到匹配的活动</strong>
          <span>换个关键词，或者切回全部活动看看。</span>
        </section>
      )}
    </>
  );
}
