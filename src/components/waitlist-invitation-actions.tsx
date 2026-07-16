"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type WaitlistInvitationActionsProps = {
  defaultContact: string;
  eventId: string;
  waitlistEntryId: string;
};

type ConvertResult = {
  message?: string;
  ok?: boolean;
  order_number?: string;
  status?: string;
};

export function WaitlistInvitationActions({ defaultContact, eventId, waitlistEntryId }: WaitlistInvitationActionsProps) {
  const [contact, setContact] = useState(defaultContact);
  const [isConverting, setIsConverting] = useState(false);
  const [notice, setNotice] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  async function acceptInvitation() {
    const nextContact = contact.trim();

    if (!nextContact) {
      setNotice("请先填写联系方式。");
      return;
    }

    if (!isSupabaseConfigured()) {
      setNotice("本地演示模式无法接受真实候补邀请，请配置 Supabase 后重试。");
      return;
    }

    setIsConverting(true);
    setNotice("");

    try {
      const accessToken = (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token;

      if (!accessToken) {
        setNotice("请先使用 Supabase 账号登录后再接受候补邀请。");
        return;
      }

      const response = await fetch("/api/waitlist/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          waitlist_entry_id: waitlistEntryId,
          contact: nextContact,
          participant_note: "accepted from waitlist invitation"
        })
      });
      const result = (await response.json().catch(() => ({}))) as ConvertResult;

      if (!response.ok || !result.ok) {
        setNotice(result.message ?? "候补转正失败。");
        return;
      }

      setOrderNumber(result.order_number ?? "");
      setNotice("候补已转为正式订单，请继续完成付款或查看订单详情。");
    } catch {
      setNotice("候补转正接口暂时不可用，请稍后重试。");
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <div className="order-actions">
      {orderNumber ? (
        <Link className="button primary" href={`/me/orders/${orderNumber}`}>
          查看订单
        </Link>
      ) : (
        <>
          <label className="inline-field compact-field">
            <span>联系方式</span>
            <input value={contact} onChange={(event) => setContact(event.target.value)} />
          </label>
          <button className="button primary" disabled={isConverting} type="button" onClick={() => void acceptInvitation()}>
            <CheckCircle2 size={16} />
            {isConverting ? "转正中" : "接受邀请"}
          </button>
          <Link className="button secondary" href={`/events/${eventId}`}>
            查看活动
          </Link>
        </>
      )}
      {notice && <p className="inline-notice">{notice}</p>}
    </div>
  );
}
