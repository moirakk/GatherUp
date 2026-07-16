"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import type { EventWaitlistEntry } from "@/lib/organizer-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type WaitlistPanelProps = {
  entries: EventWaitlistEntry[];
};

type WaitlistInviteResult = {
  invitation_expires_at?: string;
  message?: string;
  ok?: boolean;
  status?: string;
  waitlist_entry_id?: string;
};

function waitlistStatusLabel(status: string) {
  const labels: Record<string, string> = {
    waiting: "等待邀请",
    invited: "已邀请",
    converted: "已转正",
    expired: "邀请过期",
    cancelled: "已取消",
    skipped: "已跳过"
  };

  return labels[status] ?? status;
}

export function WaitlistPanel({ entries }: WaitlistPanelProps) {
  const [rows, setRows] = useState(entries);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  async function invite(entry: EventWaitlistEntry) {
    if (!isSupabaseConfigured()) {
      setNotice("本地演示模式无法发送真实候补邀请，请配置 Supabase 后重试。");
      return;
    }

    setBusyId(entry.id);
    setNotice("");

    try {
      const accessToken = (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token;

      if (!accessToken) {
        setNotice("请先使用 Supabase 账号登录后再邀请候补用户。");
        return;
      }

      const response = await fetch("/api/waitlist/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ waitlist_entry_id: entry.id })
      });
      const result = (await response.json().catch(() => ({}))) as WaitlistInviteResult;

      if (!response.ok || !result.ok) {
        setNotice(result.message ?? "候补邀请失败。");
        return;
      }

      setRows((current) =>
        current.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                expiresAt: result.invitation_expires_at ?? item.expiresAt,
                invitedAt: "刚刚",
                status: String(result.status ?? "invited")
              }
            : item
        )
      );
      setNotice(`${entry.publicId} 已收到候补转正邀请。`);
    } catch {
      setNotice("候补邀请接口暂时不可用，请稍后重试。");
    } finally {
      setBusyId("");
    }
  }

  const waitingCount = rows.filter((entry) => entry.status === "waiting").length;

  return (
    <div className="review-table-stack">
      <div className="review-toolbar">
        <strong>{waitingCount} 位候补等待邀请</strong>
        <span>有名额释放后，按排序发送转正邀请；邀请过期后再处理下一位。</span>
      </div>
      {notice && <p className="inline-notice">{notice}</p>}
      {rows.length === 0 ? (
        <div className="empty-state">暂无候补参与者。</div>
      ) : (
        <div className="data-table compact">
          <div className="table-row header">
            <span>参与者</span><span>人数</span><span>排序</span><span>状态</span><span>处理</span>
          </div>
          {rows.map((entry) => {
            const canInvite = entry.status === "waiting";
            const isBusy = busyId === entry.id;

            return (
              <div className="table-row" key={entry.id}>
                <span>
                  <strong>{entry.publicId}</strong>
                  <small>{entry.participantName} · {entry.createdAt}</small>
                </span>
                <span>
                  {entry.desiredQuantity} 人
                  <small>{entry.note}</small>
                </span>
                <span>{entry.priorityPosition ?? "待排序"}</span>
                <span className="status-badge neutral">
                  {waitlistStatusLabel(entry.status)}
                  {entry.status === "invited" && <small>至 {entry.expiresAt}</small>}
                </span>
                <span className="review-actions">
                  {canInvite ? (
                    <button className="mini-action approve" disabled={isBusy} type="button" onClick={() => void invite(entry)}>
                      <Send size={14} />
                      发邀请
                    </button>
                  ) : (
                    <small>{entry.invitedAt}</small>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
