import { EventBrowser } from "@/components/event-browser";
import { getPublicEvents } from "@/lib/events-data";

export default async function HomePage() {
  const events = await getPublicEvents();
  const cityCount = new Set(events.map((event) => event.city)).size;
  const availableSeats = events.reduce((sum, event) => sum + Math.max(event.capacity - event.registered, 0), 0);

  return (
    <>
      <section className="page-header discovery-header">
        <div className="discovery-copy">
          <p className="eyebrow">GatherUp 活动广场</p>
          <h1>把线上同好，带到真实见面</h1>
          <p className="subtle">发现可信的线下活动，从报名、付款到现场签到，都在一个清楚的流程里完成。</p>
        </div>
        <div className="discovery-stats" aria-label="活动广场概况">
          <span><strong>{events.length}</strong> 场活动</span>
          <span><strong>{cityCount}</strong> 座城市</span>
          <span><strong>{availableSeats}</strong> 个余位</span>
        </div>
      </section>

      <EventBrowser events={events} />
    </>
  );
}
