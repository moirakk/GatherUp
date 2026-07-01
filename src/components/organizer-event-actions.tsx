"use client";

import { useState } from "react";
import { Download, LinkIcon, Megaphone, QrCode } from "lucide-react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type OrganizerEventActionsProps = {
  eventId: string;
  eventName: string;
  publicCode: string;
  status?: string;
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

function downloadBlob(blob: Blob, filename: string) {
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
  status,
  registrations,
  variant
}: OrganizerEventActionsProps) {
  const [notice, setNotice] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const canOpenRegistration = status === "草稿配置" || status === "数调中" || status === "待开放报名";

  async function copyPublicLink(label = "活动链接") {
    const url = getEventUrl(eventId);

    try {
      await navigator.clipboard.writeText(url);
      setNotice(`${label}已复制`);
    } catch {
      setNotice(`复制失败，请手动复制：${url}`);
    }
  }

  async function exportFile(kind: "attendees" | "finance") {
    const accessToken = isSupabaseConfigured()
      ? (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token
      : "";

    if (!accessToken) {
      setNotice("请先使用 Supabase 账号登录，再导出真实数据。");
      return;
    }

    const response = await fetch(`/api/export/${kind}?event_id=${encodeURIComponent(publicCode)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      setNotice(result.message ?? "导出失败，请稍后重试。");
      return;
    }

    downloadBlob(await response.blob(), `${publicCode}-${kind}.xlsx`);
    setNotice(kind === "attendees" ? "报名名单已下载" : "财务对账单已下载");
  }

  function exportRegistrations() {
    void exportFile("attendees");
  }

  function exportFinance() {
    void exportFile("finance");
  }

  async function publishEvent() {
    const accessToken = isSupabaseConfigured()
      ? (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token
      : "";

    if (!accessToken) {
      setNotice("请先使用 Supabase 账号登录，再开放真实报名。");
      return;
    }

    setIsPublishing(true);
    setNotice("");

    try {
      const response = await fetch("/api/events/publish", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ event_id: eventId })
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setNotice(result.message ?? "开放报名失败，请稍后重试。");
        return;
      }

      setNotice(`${eventName} 已开放报名。`);
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "开放报名失败，请稍后重试。");
    } finally {
      setIsPublishing(false);
    }
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
      {canOpenRegistration && (
        <button className="button primary" disabled={isPublishing} type="button" onClick={publishEvent}>
          <Megaphone size={16} />
          {isPublishing ? "开放中" : "开放报名"}
        </button>
      )}
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
