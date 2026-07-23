import { EventBrowser } from "@/components/event-browser";
import { getPublicEvents } from "@/lib/events-data";

export default async function HomePage() {
  const events = await getPublicEvents();
  const cityCount = new Set(events.map((event) => event.city)).size;

  return (
    <div className="g2-page">
      <header className="g2-page-head">
        <h1 className="g2-brand-title">活动广场</h1>
        <p className="g2-brand-sub">{events.length} 场活动 · {cityCount} 座城市 · 相聚在线下</p>
      </header>

      <EventBrowser events={events} />
    </div>
  );
}
