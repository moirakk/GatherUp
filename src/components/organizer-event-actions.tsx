"use client";

import { useState } from "react";
import { Download, LinkIcon, QrCode } from "lucide-react";

type OrganizerEventActionsProps = {
  eventId: string;
  eventName: string;
  publicCode: string;
  registrations: Array<{
    orderNumber: string;
    nickname: string;
    quantity: number;
    amount: number;
    paymentStatus: string;
    seatStatus: string;
  }>;
  variant: "header" | "setup";
};

function getEventUrl(eventId: string) {
  if (typeof window === "undefined") {
    return `/events/${eventId}`;
  }

  return `${window.location.origin}/events/${eventId}`;
}

export function OrganizerEventActions({
  eventId,
  eventName,
  publicCode,
  registrations,
  variant
}: OrganizerEventActionsProps) {
  const [notice, setNotice] = useState("");

  async function copyPublicLink(label = "活动链接") {
    const url = getEventUrl(eventId);

    try {
      await navigator.clipboard.writeText(url);
      setNotice(`${label}已复制`);
    } catch {
      setNotice(`复制失败，请手动复制：${url}`);
    }
  }

  function exportRegistrations() {
    window.location.href = `/api/export/attendees?event_id=${encodeURIComponent(publicCode)}`;
    setNotice("正在下载报名名单 .xlsx");
  }

  function exportFinance() {
    window.location.href = `/api/export/finance?event_id=${encodeURIComponent(publicCode)}`;
    setNotice("正在下载财务对账单 .xlsx");
  }

  if (variant === "setup") {
    return (
      <>
        <div className="button-row">
          <button className="button primary" type="button" onClick={() => setNotice("请进入财务页上传或更换收款二维码。")}>
            <QrCode size={16} />
            更新收款码
          </button>
          <button className="button secondary" type="button" onClick={() => copyPublicLink("报名链接")}>
            <LinkIcon size={16} />
            开放报名链接
          </button>
        </div>
        {notice && <p className="inline-notice">{notice}</p>}
      </>
    );
  }

  return (
    <>
      <button className="button secondary" type="button" onClick={() => copyPublicLink()}>
        <LinkIcon size={16} />
        复制链接
      </button>
      <button className="button secondary" type="button" onClick={exportRegistrations}>
        <Download size={16} />
        名单
      </button>
      <button className="button secondary" type="button" onClick={exportFinance}>
        <Download size={16} />
        财务
      </button>
      {notice && <span className="button-feedback">{notice}</span>}
    </>
  );
}
