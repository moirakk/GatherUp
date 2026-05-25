"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, RotateCcw, TicketCheck } from "lucide-react";

import { type Registration } from "@/lib/mock-data";

type ParticipantOrderActionsProps = {
  eventId: string;
  registration: Registration;
};

export function ParticipantOrderActions({ eventId, registration }: ParticipantOrderActionsProps) {
  const [notice, setNotice] = useState("");
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

  return (
    <div className="participant-action-stack">
      {notice && <p className="inline-notice">{notice}</p>}
      {isConfirmed && (
        <Link className="button primary full" href={`/events/${eventId}/register?step=seat`}>
          <TicketCheck size={17} />
          去选座/查看入场信息
        </Link>
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
