"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ShieldCheck, XCircle } from "lucide-react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AdminVerification = {
  id: string;
  applicant_name: string;
  applicant_public_id: string;
  status: string;
  contact_email: string | null;
  contact_phone: string | null;
  community_account: string | null;
  past_event_summary: string | null;
  review_note: string | null;
  force_review_required: boolean;
  updated_at: string;
};

type Decision = "APPROVED" | "ENHANCED_VERIFIED" | "REJECTED" | "SUSPENDED";

const statusLabels: Record<string, string> = {
  pending: "待审核",
  rejected: "已驳回",
  light_verified: "轻量认证通过",
  enhanced_verified: "强化认证通过",
  suspended: "已暂停"
};

function statusLabel(status: string) {
  return statusLabels[status] ?? status;
}

export function AdminVerificationReviewPanel() {
  const [items, setItems] = useState<AdminVerification[]>([]);
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
      const response = await fetch("/api/admin/organizer-verifications", {
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {}
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setNotice(typeof payload?.message === "string" ? payload.message : "认证审核列表读取失败。");
        return;
      }

      setItems(payload.verifications as AdminVerification[]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "认证审核列表读取失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function reviewVerification(item: AdminVerification, decision: Decision) {
    const reviewNote = notes[item.id]?.trim() ?? "";

    if ((decision === "REJECTED" || decision === "SUSPENDED") && !reviewNote) {
      setNotice("驳回或暂停认证时必须填写审核备注。");
      return;
    }

    setBusyId(item.id);
    setNotice("");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/admin/organizer-verifications", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          verification_id: item.id,
          decision,
          review_note: reviewNote
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setNotice(typeof payload?.message === "string" ? payload.message : "认证审核失败。");
        return;
      }

      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setNotice("主办认证审核已更新。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "认证审核失败。");
    } finally {
      setBusyId("");
    }
  }

  return (
    <article className="content-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin review</p>
          <h2>主办认证审核</h2>
          <p className="subtle">先完成认证审核，再允许收费活动开放报名。</p>
        </div>
        <ShieldCheck size={22} />
      </div>

      {notice && <p className="inline-notice">{notice}</p>}
      {isLoading && <p className="subtle">正在读取审核队列。</p>}
      {!isLoading && items.length === 0 && <p className="subtle">暂无待处理主办认证。</p>}

      <div className="notice-list">
        {items.map((item) => {
          const isBusy = busyId === item.id;

          return (
            <div className="admin-review-item" key={item.id}>
              <div className="section-heading compact-heading">
                <div>
                  <strong>{item.applicant_name}</strong>
                  <p className="subtle">{item.applicant_public_id} · {statusLabel(item.status)} · {new Date(item.updated_at).toLocaleString("zh-CN")}</p>
                </div>
                <span className="status-badge warning">{statusLabel(item.status)}</span>
              </div>
              <dl className="summary-list">
                <div><dt>联系方式</dt><dd>{[item.contact_email, item.contact_phone].filter(Boolean).join(" / ") || "未填写"}</dd></div>
                <div><dt>社群账号</dt><dd>{item.community_account || "未填写"}</dd></div>
                <div><dt>活动经验</dt><dd>{item.past_event_summary || "未填写"}</dd></div>
              </dl>
              <label>
                审核备注
                <input value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} />
              </label>
              <div className="button-row">
                <button className="button primary" type="button" disabled={isBusy} onClick={() => void reviewVerification(item, "APPROVED")}>
                  <BadgeCheck size={16} />
                  轻量通过
                </button>
                <button className="button secondary" type="button" disabled={isBusy} onClick={() => void reviewVerification(item, "ENHANCED_VERIFIED")}>
                  强化通过
                </button>
                <button className="button secondary" type="button" disabled={isBusy} onClick={() => void reviewVerification(item, "REJECTED")}>
                  <XCircle size={16} />
                  驳回
                </button>
                <button className="button secondary" type="button" disabled={isBusy} onClick={() => void reviewVerification(item, "SUSPENDED")}>
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
