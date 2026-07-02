"use client";

import { useState } from "react";
import { Pencil, Save } from "lucide-react";

import { type GatherEvent } from "@/lib/mock-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type EventBasicsEditorProps = {
  event: GatherEvent;
};

function toEditableDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" }).slice(0, 16);
}

export function EventBasicsEditor({ event }: EventBasicsEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({
    name: event.name,
    city: event.city,
    venue: event.venue,
    address: event.address,
    startsAt: toEditableDateTime(event.startsAt),
    deadline: toEditableDateTime(event.deadline),
    capacity: String(event.capacity),
    description: event.description
  });

  function updateDraft(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function saveBasics() {
    if (!isSupabaseConfigured()) {
      setNotice("本地演示模式无法保存活动编辑，请配置 Supabase 后重试。");
      return;
    }

    setIsSaving(true);
    setNotice("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/events/update", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          event_id: event.id,
          name: draft.name,
          city: draft.city,
          venue_name: draft.venue,
          address: draft.address,
          starts_at: draft.startsAt,
          registration_deadline: draft.deadline,
          capacity: Number(draft.capacity),
          description: draft.description
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setNotice(typeof payload?.message === "string" ? payload.message : "活动编辑失败，请稍后重试。");
        return;
      }

      setNotice(payload.review_required ? "活动基础信息已保存，关键变更已提交平台复审。" : "活动基础信息已保存。");
      setIsOpen(false);
      window.location.reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "活动编辑失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="event-basics-editor">
      <div className="button-row">
        <button className="button secondary compact" type="button" onClick={() => setIsOpen((current) => !current)}>
          <Pencil size={15} />
          {isOpen ? "收起编辑" : "编辑基础信息"}
        </button>
      </div>
      {notice && <p className="inline-notice">{notice}</p>}
      {isOpen && (
        <div className="expense-form">
          <div className="form-grid two-column">
            <label>活动名称<input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} /></label>
            <label>城市<input value={draft.city} onChange={(event) => updateDraft("city", event.target.value)} /></label>
            <label>场地<input value={draft.venue} onChange={(event) => updateDraft("venue", event.target.value)} /></label>
            <label>人数上限<input inputMode="numeric" value={draft.capacity} onChange={(event) => updateDraft("capacity", event.target.value)} /></label>
            <label>活动时间<input value={draft.startsAt} onChange={(event) => updateDraft("startsAt", event.target.value)} /></label>
            <label>报名截止<input value={draft.deadline} onChange={(event) => updateDraft("deadline", event.target.value)} /></label>
            <label className="wide-field">地址<input value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} /></label>
            <label className="wide-field">活动说明<input value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} /></label>
          </div>
          <button className="button primary" disabled={isSaving} type="button" onClick={saveBasics}>
            <Save size={16} />
            {isSaving ? "保存中" : "保存基础信息"}
          </button>
        </div>
      )}
    </div>
  );
}
