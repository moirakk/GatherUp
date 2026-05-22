"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, MapPin, Search, Star } from "lucide-react";

import { type VenueSupportStatus, type VenueType, venues } from "@/lib/mock-data";

const cityFilters = ["全部", ...Array.from(new Set(venues.map((venue) => venue.city)))] as const;
const typeFilters = ["全部", "影院", "咖啡馆", "会议室"] as const;
const statusFilters: Array<"全部" | VenueSupportStatus> = ["全部", "确认可办", "可能可办", "未知待确认"];

export default function VenuesPage() {
  const [cityFilter, setCityFilter] = useState<(typeof cityFilters)[number]>("全部");
  const [typeFilter, setTypeFilter] = useState<"全部" | VenueType>("全部");
  const [statusFilter, setStatusFilter] = useState<"全部" | VenueSupportStatus>("全部");
  const [query, setQuery] = useState("");

  const filteredVenues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return venues.filter((venue) => {
      const matchesCity = cityFilter === "全部" || venue.city === cityFilter;
      const matchesType = typeFilter === "全部" || venue.type === typeFilter;
      const matchesStatus = statusFilter === "全部" || venue.supportStatus === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [venue.name, venue.city, venue.district, venue.type, venue.supportStatus, venue.suitableFor.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCity && matchesType && matchesStatus && matchesQuery;
    });
  }, [cityFilter, query, statusFilter, typeFilter]);

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">场地库</p>
          <h1>找到真正适合办活动的空间</h1>
          <p className="subtle">沉淀各城市影院、咖啡馆和会议空间的可办状态、沟通经验、价格备注和体验评价。</p>
        </div>
        <Link className="button primary" href="/organizer/events/new">
          创建活动
        </Link>
      </section>

      <section className="filter-bar" aria-label="场地筛选">
        <label className="search-field">
          <Search size={15} />
          <input
            placeholder="搜索城市、场地或适合活动"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {cityFilters.map((city) => (
          <button
            aria-pressed={cityFilter === city}
            className={`chip ${cityFilter === city ? "active" : ""}`}
            key={city}
            type="button"
            onClick={() => setCityFilter(city)}
          >
            {city === "全部" ? "全部城市" : city}
          </button>
        ))}
      </section>

      <section className="filter-bar compact-filter" aria-label="场地类型和状态筛选">
        {typeFilters.map((type) => (
          <button
            aria-pressed={typeFilter === type}
            className={`chip ${typeFilter === type ? "active" : ""}`}
            key={type}
            type="button"
            onClick={() => setTypeFilter(type)}
          >
            {type === "全部" ? "全部类型" : type}
          </button>
        ))}
        {statusFilters.map((status) => (
          <button
            aria-pressed={statusFilter === status}
            className={`chip ${statusFilter === status ? "active" : ""}`}
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
          >
            {status === "全部" ? "全部状态" : status}
          </button>
        ))}
      </section>

      {filteredVenues.length > 0 ? (
        <section className="venue-grid">
          {filteredVenues.map((venue) => (
            <article className="venue-card" key={venue.id}>
              <div className="event-card-top">
                <span className="tag">{venue.type}</span>
                <span className={`status-badge ${venue.supportStatus === "确认可办" ? "success" : venue.supportStatus === "可能可办" ? "warning" : "neutral"}`}>
                  {venue.supportStatus}
                </span>
              </div>

              <div>
                <h3>{venue.name}</h3>
                <p className="event-meta">
                  <MapPin size={15} />
                  {venue.city} · {venue.district}
                </p>
                <p className="event-meta">
                  <Building2 size={15} />
                  {venue.capacity}
                </p>
              </div>

              <div className="tag-row">
                {venue.suitableFor.slice(0, 3).map((item) => (
                  <span className="tag" key={item}>{item}</span>
                ))}
              </div>

              <p className="subtle">{venue.organizerNotes}</p>

              <div className="event-card-bottom">
                <div>
                  <strong><Star size={16} /> {venue.rating.toFixed(1)}</strong>
                  <span>{venue.reviewCount} 条经验 · {venue.lastVerified} 更新</span>
                </div>
                <Link className="button secondary" href={`/venues/${venue.id}`}>
                  查看情报
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <strong>暂时没有匹配场地</strong>
          <span>可以换个城市或类型，也可以在活动结束后补充新的场地经验。</span>
        </section>
      )}
    </>
  );
}
