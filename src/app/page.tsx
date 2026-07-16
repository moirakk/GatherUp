import { EventBrowser } from "@/components/event-browser";
import { getPublicEvents } from "@/lib/events-data";
import styles from "./home.module.css";

export default async function HomePage() {
  const events = await getPublicEvents();
  const cityCount = new Set(events.map((event) => event.city)).size;
  const availableSeats = events.reduce((sum, event) => sum + Math.max(event.capacity - event.registered, 0), 0);

  return (
    <>
      <section className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>活动发现 · 2026 夏季</p>
          <h1>找到下一次值得出门的见面</h1>
        </div>
        <div>
          <p className={styles.summary}>从小型同好聚会到城市论坛，查看真实余位、报名阶段和场地信息，选择适合你的活动。</p>
          <dl className={styles.stats} aria-label="活动广场概况">
            <div><dt>正在招募</dt><dd>{events.length} 场</dd></div>
            <div><dt>覆盖城市</dt><dd>{cityCount} 座</dd></div>
            <div><dt>当前余位</dt><dd>{availableSeats} 个</dd></div>
          </dl>
        </div>
      </section>

      <EventBrowser events={events} />
    </>
  );
}
