"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import { type EventOrganizer } from "@/lib/mock-data";

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
  const link = publicUrl(eventId);

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label}已复制`);
    } catch {
      setNotice(`复制失败，请手动复制：${value}`);
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
            <strong>{organizer.role}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
