"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { EventCard } from "@/components/event-card";
import { type EventCategory, type GatherEvent } from "@/lib/mock-data";

const categoryFilters = ["全部", "同好活动", "校园活动", "会议会务", "好友聚会"] as const;

type EventBrowserProps = {
  events: GatherEvent[];
};

export function EventBrowser({ events }: EventBrowserProps) {
  const [categoryFilter, setCategoryFilter] = useState<"全部" | EventCategory>("全部");
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesCategory = categoryFilter === "全部" || event.category === categoryFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [event.name, event.publicCode, event.city, event.venue, event.category, event.customTypeLabel, event.template]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [events, query, categoryFilter]);

  return (
    <>
      <label className="g2-search">
        <Search size={16} aria-hidden="true" />
        <input
          placeholder="搜索活动、活动ID、城市或场地"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <nav className="g2-tabs" aria-label="活动筛选">
        {categoryFilters.map((category) => (
          <button
            aria-pressed={categoryFilter === category}
            className={`g2-tab ${categoryFilter === category ? "active" : ""}`}
            key={category}
            type="button"
            onClick={() => setCategoryFilter(category)}
          >
            {category === "全部" ? "全部活动" : category}
          </button>
        ))}
      </nav>

      <p className="g2-section-label">本季活动</p>

      {filteredEvents.length > 0 ? (
        <section className="g2-cards">
          {filteredEvents.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </section>
      ) : (
        <section className="g2-empty">
          <strong>没有找到匹配的活动</strong>
          <span>换个关键词，或者切回全部活动看看。</span>
        </section>
      )}
    </>
  );
}
