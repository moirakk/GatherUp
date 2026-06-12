import { EventBrowser } from "@/components/event-browser";
import { getPublicEvents } from "@/lib/events-data";

export default async function HomePage() {
  const events = await getPublicEvents();

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">活动广场</p>
          <h1>找到正在招募的线下活动</h1>
          <p className="subtle">公开活动会出现在这里。报名、付款、选座和通知都会保存在同一个订单里。</p>
        </div>
      </section>

      <EventBrowser events={events} />
    </>
  );
}
