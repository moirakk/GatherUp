"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, ShieldAlert } from "lucide-react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AdminEventReview = {
  id: string;
  status: string;
  reason: string | null;
  requester_name: string;
  requester_public_id: string;
  event_name: string;
  event_public_code: string;
  event_city: string | null;
  event_venue_name: string | null;
  event_starts_at: string | null;
  event_price_cents: number;
  event_status: string;
  event_review_status: string;
  updated_at: string;
};

type Decision = "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "SUSPENDED";

const statusLabels: Record<string, string> = {
  pending: "待审核",
  changes_requested: "需修改",
  approved: "已通过",
  rejected: "已驳回",
  suspended: "已暂停"
};

function statusLabel(status: string) {
  return statusLabels[status] ?? status;
}

function formatMoney(cents: number) {
  if (!Number.isFinite(cents) || cents <= 0) {
    return "免费";
  }

  return `¥${(cents / 100).toFixed(2)}`;
}

export function AdminEventReviewPanel() {
  const [items, setItems] = useState<AdminEventReview[]>([]);
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function getAccessToken() {
    if (!isSupabaseConfigured()) {
      return "";
    }

    const supabase = getSupabaseBrowserClient();
    return (await supabase.auth.getSession()).data.session?.access_token ?? "";
  }

  async function loadItems() {
    setIsLoading(true);
    setNotice("");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/admin/event-reviews", {
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {}
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setNotice(typeof payload?.message === "string" ? payload.message : "活动审核列表读取失败。");
        return;
      }

      setItems(payload.reviews as AdminEventReview[]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "活动审核列表读取失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function reviewEvent(item: AdminEventReview, decision: Decision) {
    const reviewNote = notes[item.id]?.trim() ?? "";

    if (decision !== "APPROVED" && !reviewNote) {
      setNotice("驳回、要求修改或暂停活动时必须填写审核备注。");
      return;
    }

    setBusyId(item.id);
    setNotice("");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/admin/event-reviews", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          review_id: item.id,
          decision,
          review_note: reviewNote
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setNotice(typeof payload?.message === "string" ? payload.message : "活动审核失败。");
        return;
      }

      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setNotice("活动审核状态已更新。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "活动审核失败。");
    } finally {
      setBusyId("");
    }
  }

  return (
    <article className="content-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Event review</p>
          <h2>活动审核</h2>
          <p className="subtle">处理需要平台确认的活动上线、修改或风险审核。</p>
        </div>
        <ClipboardCheck size={22} />
      </div>

      {notice && <p className="inline-notice">{notice}</p>}
      {isLoading && <p className="subtle">正在读取活动审核队列。</p>}
      {!isLoading && items.length === 0 && <p className="subtle">暂无待处理活动审核。</p>}

      <div className="notice-list">
        {items.map((item) => {
          const isBusy = busyId === item.id;

          return (
            <div className="admin-review-item" key={item.id}>
              <div className="section-heading compact-heading">
                <div>
                  <strong>{item.event_name}</strong>
                  <p className="subtle">
                    {item.event_public_code} · {statusLabel(item.status)} · {item.requester_name}({item.requester_public_id})
                  </p>
                </div>
                <span className="status-badge warning">{statusLabel(item.event_review_status)}</span>
              </div>
              <dl className="summary-list">
                <div><dt>时间地点</dt><dd>{[item.event_city, item.event_venue_name, item.event_starts_at].filter(Boolean).join(" / ") || "未填写"}</dd></div>
                <div><dt>价格与状态</dt><dd>{formatMoney(Number(item.event_price_cents))} / {item.event_status}</dd></div>
                <div><dt>提交原因</dt><dd>{item.reason || "未填写"}</dd></div>
              </dl>
              <label>
                审核备注
                <input value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} />
              </label>
              <div className="button-row">
                <button className="button primary" type="button" disabled={isBusy} onClick={() => void reviewEvent(item, "APPROVED")}>
                  <ClipboardCheck size={16} />
                  通过
                </button>
                <button className="button secondary" type="button" disabled={isBusy} onClick={() => void reviewEvent(item, "CHANGES_REQUESTED")}>
                  要求修改
                </button>
                <button className="button secondary" type="button" disabled={isBusy} onClick={() => void reviewEvent(item, "REJECTED")}>
                  驳回
                </button>
                <button className="button secondary" type="button" disabled={isBusy} onClick={() => void reviewEvent(item, "SUSPENDED")}>
                  <ShieldAlert size={16} />
                  暂停
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
