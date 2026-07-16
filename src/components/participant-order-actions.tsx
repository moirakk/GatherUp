"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, RotateCcw, TicketCheck, Undo2 } from "lucide-react";

import { type Registration } from "@/lib/mock-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ParticipantOrderActionsProps = {
  eventId: string;
  registration: Registration;
};

export function ParticipantOrderActions({ eventId, registration }: ParticipantOrderActionsProps) {
  const [notice, setNotice] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);
  const [refundStatus, setRefundStatus] = useState("");
  const isConfirmed = registration.paymentStatus === "付款已确认";
  const isRejected = registration.paymentStatus === "已驳回";
  const isPending = registration.paymentStatus === "待审核";

  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(registration.orderNumber);
      setNotice("订单号已复制");
    } catch {
      setNotice(`复制失败，请手动复制：${registration.orderNumber}`);
    }
  }

  async function requestRefund() {
    const reason = refundReason.trim();

    if (!reason) {
      setNotice("请填写退款原因。");
      return;
    }

    if (!isSupabaseConfigured()) {
      setNotice("本地演示模式无法申请真实退款，请配置 Supabase 后重试。");
      return;
    }

    setIsRequestingRefund(true);
    setNotice("");

    try {
      const accessToken = (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token;

      if (!accessToken) {
        setNotice("请先使用 Supabase 账号登录后再申请退款。");
        return;
      }

      const response = await fetch("/api/orders/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          order_number: registration.orderNumber,
          reason
        })
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; status?: string };

      if (!response.ok || !result.ok) {
        setNotice(result.message ?? "退款申请提交失败。");
        return;
      }

      setRefundStatus(String(result.status ?? "requested"));
      setShowRefundForm(false);
      setRefundReason("");
      setNotice("退款申请已提交，等待主办方审核。");
    } catch {
      setNotice("退款申请接口暂时不可用，请稍后重试。");
    } finally {
      setIsRequestingRefund(false);
    }
  }

  return (
    <div className="participant-action-stack">
      {notice && <p className="inline-notice">{notice}</p>}
      {isConfirmed && (
        <Link className="button primary full" href={`/events/${eventId}/register?step=seat`}>
          <TicketCheck size={17} />
          去选座/查看入场信息
        </Link>
      )}
      {isConfirmed && (
        <button className="button secondary full" type="button" onClick={() => setShowRefundForm((current) => !current)}>
          <Undo2 size={17} />
          申请退款
        </button>
      )}
      {showRefundForm && (
        <div className="notice-list">
          <label className="inline-field">
            <span>退款原因</span>
            <input
              value={refundReason}
              placeholder="请说明退款原因，主办方会据此审核。"
              onChange={(event) => setRefundReason(event.target.value)}
            />
          </label>
          <button className="button primary full" type="button" disabled={isRequestingRefund} onClick={() => void requestRefund()}>
            {isRequestingRefund ? "提交中" : "提交退款申请"}
          </button>
        </div>
      )}
      {refundStatus && <p className="inline-notice">当前退款状态：{refundStatus}</p>}
      {isRejected && (
        <Link className="button primary full" href={`/events/${eventId}/register?step=payment`}>
          <RotateCcw size={17} />
          重新上传付款截图
        </Link>
      )}
      {isPending && (
        <button className="button primary full" type="button" disabled>
          等待组织者审核
        </button>
      )}
      <button className="button secondary full" type="button" onClick={copyOrderNumber}>
        <Copy size={17} />
        复制订单号
      </button>
      <Link className="button secondary full" href={`/events/${eventId}`}>
        查看活动详情
      </Link>
    </div>
  );
}
