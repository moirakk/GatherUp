"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";

import { type Registration } from "@/lib/mock-data";
import { StatusBadge } from "@/components/status-badge";

type PaymentReviewTableProps = {
  registrations: Registration[];
};

export function PaymentReviewTable({ registrations }: PaymentReviewTableProps) {
  const [rows, setRows] = useState(registrations);
  const [notice, setNotice] = useState("");

  const pendingCount = useMemo(
    () => rows.filter((registration) => registration.paymentStatus === "待审核").length,
    [rows]
  );

  async function updatePayment(orderNumber: string, paymentStatus: Registration["paymentStatus"]) {
    const previousRows = rows;
    setRows((current) =>
      current.map((registration) =>
        registration.orderNumber === orderNumber
          ? {
              ...registration,
              paymentStatus,
              registrationStatus: paymentStatus === "付款已确认" ? "已确认" : registration.registrationStatus,
              seatStatus: paymentStatus === "付款已确认" ? "待选座" : registration.seatStatus
            }
          : registration
      )
    );

    try {
      const response = await fetch("/api/orders/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderNumber,
          result: paymentStatus === "付款已确认" ? "APPROVED" : "REJECTED"
        })
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setRows(previousRows);
        setNotice(`${orderNumber} 审核未写入数据库：${result.message ?? "接口返回失败"}`);
        return;
      }

      setNotice(`${orderNumber} 已${paymentStatus === "付款已确认" ? "通过" : "驳回"}付款审核`);
    } catch {
      setRows(previousRows);
      setNotice(`${orderNumber} 审核未写入数据库，请稍后重试。`);
    }
  }

  return (
    <div className="review-table-stack">
      <div className="review-toolbar">
        <strong>{pendingCount} 笔待审核</strong>
        <span>通过后参与者才能进入选座；驳回后需要重新上传付款截图。</span>
      </div>
      {notice && <p className="inline-notice">{notice}</p>}
      <div className="data-table compact payment-review-table">
        <div className="table-row header">
          <span>订单</span><span>昵称</span><span>人数</span><span>付款</span><span>座位</span><span>审核</span>
        </div>
        {rows.map((registration) => {
          const canReview = registration.paymentStatus === "待审核";

          return (
            <div className="table-row" key={registration.orderNumber}>
              <span>
                <strong>{registration.orderNumber}</strong>
                <small>{registration.createdAt}</small>
              </span>
              <span>{registration.nickname}</span>
              <span>{registration.quantity}</span>
              <StatusBadge>{registration.paymentStatus}</StatusBadge>
              <span>{registration.seatStatus}</span>
              <span className="review-actions">
                <button
                  className="mini-action approve"
                  disabled={!canReview}
                  type="button"
                  onClick={() => updatePayment(registration.orderNumber, "付款已确认")}
                >
                  <Check size={14} />
                  通过
                </button>
                <button
                  className="mini-action reject"
                  disabled={!canReview}
                  type="button"
                  onClick={() => updatePayment(registration.orderNumber, "已驳回")}
                >
                  <X size={14} />
                  驳回
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
