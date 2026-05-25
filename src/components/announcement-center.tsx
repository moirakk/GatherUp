"use client";

import { useMemo, useState } from "react";
import { BellRing, Copy, Send } from "lucide-react";

import { type AnnouncementType, type EventAnnouncement, type GatherEvent } from "@/lib/mock-data";
import { StatusBadge } from "@/components/status-badge";

type AnnouncementCenterProps = {
  announcements: EventAnnouncement[];
  event: GatherEvent;
};

const announcementTypes: AnnouncementType[] = ["报名通知", "付款提醒", "选座通知", "成团通知", "活动当日通知"];

function getDefaultContent(event: GatherEvent, type: AnnouncementType) {
  if (type === "付款提醒") {
    return `请已报名的参与者按订单金额付款，并上传付款截图。付款备注建议填写订单号 + 昵称，方便组织者核对。\n活动：${event.name}\n活动 ID：${event.publicCode}`;
  }

  if (type === "选座通知") {
    return `付款已确认的参与者可以进入订单详情页选择座位。请尽量在活动前完成选座，现场会按订单号和 GatherUp ID 核验。`;
  }

  if (type === "活动当日通知") {
    return `活动当天请提前到达 ${event.venue}。如需核验，请准备订单号和 GatherUp ID。`;
  }

  if (type === "成团通知") {
    return `${event.name} 已确认成团。后续如有场地、入场或物料安排变更，会继续通过 GatherUp 通知。`;
  }

  return `${event.name} 的报名/意向入口已开放。请先完成数调和地点偏好，正式报名开放后再生成订单。`;
}

export function AnnouncementCenter({ announcements, event }: AnnouncementCenterProps) {
  const [rows, setRows] = useState(announcements);
  const [notice, setNotice] = useState("");
  const [type, setType] = useState<AnnouncementType>("报名通知");
  const [title, setTitle] = useState("报名入口和活动提醒");
  const [content, setContent] = useState(() => getDefaultContent(event, "报名通知"));

  const publishedCount = useMemo(
    () => rows.filter((announcement) => announcement.status === "已发布").length,
    [rows]
  );

  const copyText = `【${event.name}】${title}\n\n${content}\n\n活动 ID：${event.publicCode}`;

  function updateType(nextType: AnnouncementType) {
    setType(nextType);
    setTitle(nextType);
    setContent(getDefaultContent(event, nextType));
    setNotice("");
  }

  async function copyAnnouncement() {
    try {
      await navigator.clipboard.writeText(copyText);
      setNotice("通知文案已复制");
    } catch {
      setNotice(`复制失败，请手动复制：${copyText}`);
    }
  }

  function publishAnnouncement() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setNotice("请先补全通知标题和内容");
      return;
    }

    setRows((current) => [
      {
        id: `ann-${Date.now()}`,
        eventId: event.id,
        type,
        title: trimmedTitle,
        content: trimmedContent,
        status: "已发布",
        publishedAt: "刚刚",
        audience: type === "付款提醒" ? "待付款参与者" : type === "选座通知" ? "已确认参与者" : "全部参与者"
      },
      ...current
    ]);
    setNotice("通知已模拟发布");
  }

  return (
    <div className="announcement-center">
      {notice && <p className="inline-notice">{notice}</p>}

      <section className="announcement-composer">
        <div className="section-heading">
          <div>
            <h3>新建通知</h3>
            <p className="subtle">第一版先生成可复制的通知文案，并在原型内模拟发布。</p>
          </div>
          <BellRing size={20} />
        </div>

        <div className="announcement-type-grid" aria-label="通知类型">
          {announcementTypes.map((item) => (
            <button className={item === type ? "active" : ""} key={item} type="button" onClick={() => updateType(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="form-grid two-column">
          <label>
            通知标题
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            通知对象
            <input readOnly value={type === "付款提醒" ? "待付款参与者" : type === "选座通知" ? "已确认参与者" : "全部参与者"} />
          </label>
        </div>

        <label className="textarea-field">
          通知内容
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} />
        </label>

        <div className="button-row">
          <button className="button secondary" type="button" onClick={copyAnnouncement}>
            <Copy size={16} />
            复制通知文案
          </button>
          <button className="button primary" type="button" onClick={publishAnnouncement}>
            <Send size={16} />
            发布通知
          </button>
        </div>
      </section>

      <aside className="announcement-history">
        <div className="section-heading">
          <div>
            <h3>通知记录</h3>
            <p className="subtle">{publishedCount} 条已发布，{rows.length - publishedCount} 条草稿。</p>
          </div>
          <Send size={20} />
        </div>

        <div className="announcement-list compact">
          {rows.map((announcement) => (
            <article className="announcement-card" key={announcement.id}>
              <div className="announcement-card-top">
                <span className="tag">{announcement.type}</span>
                <StatusBadge>{announcement.status}</StatusBadge>
              </div>
              <strong>{announcement.title}</strong>
              <p>{announcement.content}</p>
              <small>{announcement.audience} · {announcement.publishedAt}</small>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}
