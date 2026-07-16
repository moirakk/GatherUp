"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { EventCard } from "@/components/event-card";
import { type EventCategory, type GatherEvent } from "@/lib/mock-data";
import styles from "./event-browser.module.css";

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

  const featuredEvent = filteredEvents[0];
  const remainingEvents = filteredEvents.slice(1);
  const hasActiveFilters = query.length > 0 || categoryFilter !== "全部";

  return (
    <section className={styles.browser}>
      <div className={styles.toolbar} aria-label="活动筛选">
        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="搜索活动"
            placeholder="搜索活动、城市或场地"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className={styles.filters}>
          {categoryFilters.map((category) => (
            <button
              aria-pressed={categoryFilter === category}
              className={`${styles.filter} ${categoryFilter === category ? styles.filterActive : ""}`}
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
            >
              {category === "全部" ? "全部" : category}
            </button>
          ))}
        </div>
        <button
          aria-label="重置活动筛选"
          className={styles.reset}
          disabled={!hasActiveFilters}
          type="button"
          onClick={() => {
            setCategoryFilter("全部");
            setQuery("");
          }}
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      {featuredEvent ? (
        <div aria-live="polite">
          <section className={styles.featured} aria-labelledby="featured-event-heading">
            <div className={styles.sectionHeading}>
              <h2 id="featured-event-heading">本周推荐</h2>
              <span>{filteredEvents.length} 场符合条件</span>
            </div>
            <EventCard event={featuredEvent} featured />
          </section>

          {remainingEvents.length > 0 ? (
            <section aria-labelledby="more-events-heading">
              <div className={styles.sectionHeading}>
                <h2 id="more-events-heading">更多活动</h2>
                <span>按近期开始排序</span>
              </div>
              <div className={styles.grid}>
                {remainingEvents.map((event) => (
                  <EventCard event={event} key={event.id} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <section className={styles.empty} aria-live="polite">
          <strong>没有找到匹配的活动</strong>
          <span>换个关键词，或者切回全部活动看看。</span>
        </section>
      )}
    </section>
  );
}
