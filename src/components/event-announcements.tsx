import { BellRing, Send } from "lucide-react";

import { type EventAnnouncement } from "@/lib/mock-data";

type EventAnnouncementsProps = {
  announcements: EventAnnouncement[];
};

export function EventAnnouncements({ announcements }: EventAnnouncementsProps) {
  const publishedAnnouncements = announcements.filter((announcement) => announcement.status === "已发布");

  return (
    <section className="content-card">
      <div className="section-heading">
        <div>
          <h2>活动通知</h2>
          <p className="subtle">组织者发布的重要变更和提醒会显示在这里。</p>
        </div>
        <BellRing size={20} />
      </div>

      {publishedAnnouncements.length > 0 ? (
        <div className="announcement-list">
          {publishedAnnouncements.map((announcement) => (
            <article className="announcement-card" key={announcement.id}>
              <div className="announcement-card-top">
                <span className="tag">{announcement.type}</span>
                <small>{announcement.publishedAt}</small>
              </div>
              <strong>{announcement.title}</strong>
              <p>{announcement.content}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-inline">
          <Send size={18} />
          <span>暂无已发布通知</span>
        </div>
      )}
    </section>
  );
}
