"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Send } from "lucide-react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type VerificationState = {
  status: string;
  contact_email: string | null;
  contact_phone: string | null;
  community_account: string | null;
  past_event_summary: string | null;
  force_review_required: boolean;
  review_note: string | null;
};

const statusLabels: Record<string, string> = {
  not_applied: "未申请",
  pending: "审核中",
  light_verified: "轻量认证通过",
  enhanced_verified: "强化认证通过",
  rejected: "已驳回",
  suspended: "已暂停"
};

function getStatusLabel(status: string) {
  return statusLabels[status] ?? status;
}

function canSubmit(status: string, forceReviewRequired: boolean) {
  return forceReviewRequired || status === "not_applied" || status === "pending" || status === "rejected";
}

export function OrganizerVerificationPanel() {
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [communityAccount, setCommunityAccount] = useState("");
  const [pastEventSummary, setPastEventSummary] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadVerification() {
      if (!isSupabaseConfigured()) {
        setNotice("本地演示模式不会读取真实主办认证。");
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        const response = await fetch("/api/organizer/verification", {
          headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {}
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.ok) {
          setNotice(typeof payload?.message === "string" ? payload.message : "主办认证状态读取失败。");
          return;
        }

        const nextVerification = payload.verification as VerificationState;
        setVerification(nextVerification);
        setContactEmail(nextVerification.contact_email ?? "");
        setContactPhone(nextVerification.contact_phone ?? "");
        setCommunityAccount(nextVerification.community_account ?? "");
        setPastEventSummary(nextVerification.past_event_summary ?? "");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "主办认证状态读取失败。");
      } finally {
        setIsLoading(false);
      }
    }

    void loadVerification();
  }, []);

  async function submitVerification() {
    if (!contactEmail.trim() && !contactPhone.trim()) {
      setNotice("请至少填写一个联系邮箱或手机号。");
      return;
    }

    if (pastEventSummary.trim().length < 12) {
      setNotice("请简要说明过往活动经验，至少 12 个字符。");
      return;
    }

    setIsSaving(true);
    setNotice("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/organizer/verification", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          contact_email: contactEmail.trim(),
          contact_phone: contactPhone.trim(),
          community_account: communityAccount.trim(),
          past_event_summary: pastEventSummary.trim()
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setNotice(typeof payload?.message === "string" ? payload.message : "主办认证提交失败。");
        return;
      }

      setVerification(payload.verification as VerificationState);
      setNotice("主办认证已提交，等待平台审核。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "主办认证提交失败。");
    } finally {
      setIsSaving(false);
    }
  }

  const status = verification?.status ?? "not_applied";
  const isSubmittable = canSubmit(status, verification?.force_review_required ?? false);

  return (
    <article className="content-card setup-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">主办认证</p>
          <h2>收费活动发布资格</h2>
          <p className="subtle">收费活动开放报名前，主办方需要完成认证。免费活动不受影响。</p>
        </div>
        <BadgeCheck size={22} />
      </div>

      <dl className="summary-list">
        <div><dt>当前状态</dt><dd><span className="status-badge neutral">{isLoading ? "读取中" : getStatusLabel(status)}</span></dd></div>
        <div><dt>重新审核</dt><dd>{verification?.force_review_required ? "需要重新审核" : "无强制要求"}</dd></div>
      </dl>

      {verification?.review_note && <p className="inline-notice">审核备注：{verification.review_note}</p>}

      {isSubmittable && (
        <div className="form-grid two-column">
          <label>联系邮箱<input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></label>
          <label>联系手机号<input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} /></label>
          <label>社群账号<input value={communityAccount} onChange={(event) => setCommunityAccount(event.target.value)} placeholder="微博 / 小红书 / X / Discord 等" /></label>
          <label>过往活动经验<input value={pastEventSummary} onChange={(event) => setPastEventSummary(event.target.value)} placeholder="简单说明办过的活动、规模和收款经验" /></label>
        </div>
      )}

      {notice && <p className="validation-note">{notice}</p>}

      {isSubmittable && (
        <button className="button primary" type="button" onClick={submitVerification} disabled={isSaving || isLoading}>
          <Send size={16} />
          {isSaving ? "提交中" : status === "pending" ? "更新申请" : "提交认证"}
        </button>
      )}
    </article>
  );
}
