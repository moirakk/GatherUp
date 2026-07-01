"use client";

import { useState } from "react";
import { Copy, Trash2, UserPlus } from "lucide-react";

import { type EventOrganizer } from "@/lib/mock-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type EventIdentityPanelProps = {
  eventId: string;
  publicCode: string;
  organizers: EventOrganizer[];
};

function publicUrl(eventId: string) {
  if (typeof window === "undefined") {
    return `/events/${eventId}`;
  }

  return `${window.location.origin}/events/${eventId}`;
}

export function EventIdentityPanel({ eventId, publicCode, organizers }: EventIdentityPanelProps) {
  const [notice, setNotice] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    publicId: "",
    role: "cohost",
    canManagePayments: false
  });
  const link = publicUrl(eventId);

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label}已复制`);
    } catch {
      setNotice(`复制失败，请手动复制：${value}`);
    }
  }

  async function addOrganizer() {
    if (!isSupabaseConfigured()) {
      setNotice("本地演示模式无法添加协作者，请配置 Supabase 后重试。");
      return;
    }

    if (!inviteForm.publicId.trim()) {
      setNotice("请填写协作者的 GatherUp ID。");
      return;
    }

    setIsSaving(true);
    setNotice("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/events/organizers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          event_id: eventId,
          public_id: inviteForm.publicId,
          role: inviteForm.role,
          can_manage_payments: inviteForm.canManagePayments
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setNotice(typeof payload?.message === "string" ? payload.message : "协作者添加失败，请稍后重试。");
        return;
      }

      setNotice("协作者已添加。");
      setInviteForm({ publicId: "", role: "cohost", canManagePayments: false });
      setIsInviteOpen(false);
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "协作者添加失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeOrganizer(publicId: string) {
    if (!isSupabaseConfigured()) {
      setNotice("本地演示模式无法移除协作者，请配置 Supabase 后重试。");
      return;
    }

    setIsSaving(true);
    setNotice("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/events/organizers", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          event_id: eventId,
          public_id: publicId
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setNotice(typeof payload?.message === "string" ? payload.message : "协作者移除失败，请稍后重试。");
        return;
      }

      setNotice("协作者已移除。");
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "协作者移除失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="identity-stack">
      {notice && <p className="inline-notice">{notice}</p>}
      <dl className="summary-list">
        <div>
          <dt>活动 ID</dt>
          <dd>
            {publicCode}
            <button className="tiny-icon-button" type="button" onClick={() => copyText("活动 ID", publicCode)} aria-label="复制活动 ID">
              <Copy size={14} />
            </button>
          </dd>
        </div>
        <div>
          <dt>公开链接</dt>
          <dd>
            /events/{eventId}
            <button className="tiny-icon-button" type="button" onClick={() => copyText("公开链接", link)} aria-label="复制公开链接">
              <Copy size={14} />
            </button>
          </dd>
        </div>
      </dl>
      <div className="organizer-list">
        {organizers.map((organizer) => (
          <div className="result-row" key={`${organizer.eventId}-${organizer.publicId}`}>
            <span>{organizer.name} · {organizer.publicId}</span>
            <span className="button-row">
              <strong>{organizer.role}</strong>
              {organizer.role !== "主办" && (
                <button
                  aria-label={`移除 ${organizer.name}`}
                  className="tiny-icon-button"
                  disabled={isSaving}
                  type="button"
                  onClick={() => removeOrganizer(organizer.publicId)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      <button className="button secondary compact" type="button" onClick={() => setIsInviteOpen((current) => !current)}>
        <UserPlus size={15} />
        {isInviteOpen ? "收起协作者" : "添加协作者"}
      </button>
      {isInviteOpen && (
        <div className="expense-form">
          <div className="form-grid two-column">
            <label>
              GatherUp ID
              <input
                placeholder="GU-USER"
                value={inviteForm.publicId}
                onChange={(event) => setInviteForm((current) => ({ ...current, publicId: event.target.value }))}
              />
            </label>
            <label>
              协作者角色
              <select value={inviteForm.role} onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value }))}>
                <option value="cohost">联合主办</option>
                <option value="finance">财务</option>
                <option value="staff">现场协作</option>
                <option value="viewer">只读</option>
              </select>
            </label>
            <label className="checkbox-field wide-field">
              <input
                checked={inviteForm.canManagePayments}
                type="checkbox"
                onChange={(event) => setInviteForm((current) => ({ ...current, canManagePayments: event.target.checked }))}
              />
              联合主办可处理付款审核
            </label>
          </div>
          <button className="button primary" disabled={isSaving} type="button" onClick={addOrganizer}>
            <UserPlus size={16} />
            {isSaving ? "添加中" : "保存协作者"}
          </button>
        </div>
      )}
    </div>
  );
}
