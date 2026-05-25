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

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
    downloadCsv(`${publicCode}-orders.csv`, [
      ["活动", eventName],
      ["活动 ID", publicCode],
      [],
      ["订单号", "昵称", "人数", "金额", "付款状态", "座位状态"],
      ...registrations.map((registration) => [
        registration.orderNumber,
        registration.nickname,
        String(registration.quantity),
        String(registration.amount),
        registration.paymentStatus,
        registration.seatStatus
      ])
    ]);
    setNotice("报名订单已导出");
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
        导出
      </button>
      {notice && <span className="button-feedback">{notice}</span>}
    </>
  );
}
