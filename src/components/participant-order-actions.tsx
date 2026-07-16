"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, RotateCcw, TicketCheck, Undo2 } from "lucide-react";

import { type Registration } from "@/lib/mock-data";
import type { OrderRefundSummary } from "@/lib/orders-data";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ParticipantOrderActionsProps = {
  eventId: string;
  registration: Registration;
  refundRequest?: OrderRefundSummary;
};

function refundStatusLabel(status: string) {
  const labels: Record<string, string> = {
    requested: "退款待审核",
    approved: "主办已同意退款",
    rejected: "退款已拒绝",
    paid_offline: "主办已线下打款",
    proof_uploaded: "退款凭证已上传",
    confirmed: "已确认收款",
    disputed: "退款有争议",
    cancelled: "退款已取消"
  };

  return labels[status] ?? status;
}

export function ParticipantOrderActions({ eventId, refundRequest, registration }: ParticipantOrderActionsProps) {
  const [notice, setNotice] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [isConfirmingRefund, setIsConfirmingRefund] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [isRequestingRefund, setIsRequestingRefund] = useState(false);
  const [refundStatus, setRefundStatus] = useState(refundRequest?.status ?? "");
  const isConfirmed = registration.paymentStatus === "付款已确认";
  const isRejected = registration.paymentStatus === "已驳回";
  const isPending = registration.paymentStatus === "待审核";
  const canRequestRefund = isConfirmed && !refundRequest && !refundStatus;
  const canConfirmRefund = refundRequest?.status === "proof_uploaded" && refundStatus !== "confirmed" && refundStatus !== "disputed";

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

  async function confirmRefundReceipt(decision: "CONFIRMED" | "DISPUTED") {
    if (!refundRequest) return;

    const note = disputeReason.trim();

    if (decision === "DISPUTED" && !note) {
      setNotice("请填写争议原因，方便主办方核对。");
      return;
    }

    if (!isSupabaseConfigured()) {
      setNotice("本地演示模式无法确认真实退款，请配置 Supabase 后重试。");
      return;
    }

    setIsConfirmingRefund(true);
    setNotice("");

    try {
      const accessToken = (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token;

      if (!accessToken) {
        setNotice("请先使用 Supabase 账号登录后再确认退款。");
        return;
      }

      const response = await fetch("/api/orders/refund/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          refund_request_id: refundRequest.id,
          decision,
          note: note || undefined
        })
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; status?: string };

      if (!response.ok || !result.ok) {
        setNotice(result.message ?? "退款确认提交失败。");
        return;
      }

      setRefundStatus(String(result.status ?? (decision === "CONFIRMED" ? "confirmed" : "disputed")));
      setShowDisputeForm(false);
      setDisputeReason("");
      setNotice(decision === "CONFIRMED" ? "已确认收到退款。" : "退款争议已提交，等待主办方处理。");
    } catch {
      setNotice("退款确认接口暂时不可用，请稍后重试。");
    } finally {
      setIsConfirmingRefund(false);
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
      {canRequestRefund && (
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
      {refundStatus && <p className="inline-notice">当前退款状态：{refundStatusLabel(refundStatus)}</p>}
      {canConfirmRefund && (
        <div className="notice-list">
          <div>主办方已上传退款凭证。请核对实际收款后确认，若金额或账户有问题可提交争议。</div>
          <button className="button primary full" type="button" disabled={isConfirmingRefund} onClick={() => void confirmRefundReceipt("CONFIRMED")}>
            已收到退款
          </button>
          <button className="button secondary full" type="button" disabled={isConfirmingRefund} onClick={() => setShowDisputeForm((current) => !current)}>
            提出争议
          </button>
        </div>
      )}
      {showDisputeForm && canConfirmRefund && (
        <div className="notice-list">
          <label className="inline-field">
            <span>争议原因</span>
            <input
              value={disputeReason}
              placeholder="例如金额未到账、金额不一致、凭证无法核对。"
              onChange={(event) => setDisputeReason(event.target.value)}
            />
          </label>
          <button className="button primary full" type="button" disabled={isConfirmingRefund} onClick={() => void confirmRefundReceipt("DISPUTED")}>
            提交争议
          </button>
        </div>
      )}
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
