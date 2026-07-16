"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, LogIn, XCircle } from "lucide-react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type CheckInResult = {
  attendee_count?: number;
  check_in_status?: string;
  error_code?: string;
  message?: string;
  ok?: boolean;
  order_number?: string;
};

type CheckInRecord = {
  detail: string;
  id: string;
  orderNumber: string;
  status: "success" | "error";
  submittedValue: string;
  time: string;
};

function normalizeInput(value: string) {
  return value.trim().replace(/^gatherup:\/\/check-in\//i, "");
}

function looksLikeOrderNumber(value: string) {
  return /^GU-[A-Z0-9-]+$/i.test(value) || /^[A-Z]{2,}-[A-Z0-9-]+-\d{3,}$/i.test(value);
}

function failureMessage(status: number, result: CheckInResult) {
  if (result.error_code === "ALREADY_CHECKED_IN") return "该订单已经核销过。";
  if (result.error_code === "ORDER_NOT_CONFIRMED") return "该订单付款尚未确认，不能核销。";
  if (result.error_code === "CHECK_IN_CODE_NOT_FOUND" || status === 404) return "订单不存在，或不属于你可管理的活动。";
  if (result.error_code === "FORBIDDEN") return "你没有该活动的核销权限。";
  if (result.error_code === "CONCURRENT_CONFLICT") return "多人同时核销，请重新查询状态。";
  return result.message ?? "核销失败，请稍后重试。";
}

export function CheckInPanel() {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [records, setRecords] = useState<CheckInRecord[]>([]);

  const canSubmit = useMemo(() => normalizeInput(inputValue).length > 0 && !isSubmitting, [inputValue, isSubmitting]);

  function pushRecord(record: Omit<CheckInRecord, "id" | "time">) {
    setRecords((current) => [
      {
        ...record,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      },
      ...current
    ].slice(0, 10));
  }

  async function submitCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submittedValue = normalizeInput(inputValue);

    if (!submittedValue) {
      setNotice("请输入订单号或核销码。");
      return;
    }

    setIsSubmitting(true);
    setNotice("");

    try {
      const accessToken = isSupabaseConfigured()
        ? (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token
        : "";

      if (!accessToken) {
        setNotice("核销未提交：请先使用 Supabase 账号登录。");
        pushRecord({
          detail: "未登录",
          orderNumber: submittedValue,
          status: "error",
          submittedValue
        });
        return;
      }

      const response = await fetch("/api/orders/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          check_in_code: submittedValue,
          order_number: looksLikeOrderNumber(submittedValue) ? submittedValue : undefined,
          note: "organizer check-in panel"
        })
      });
      const result = (await response.json()) as CheckInResult;

      if (!response.ok || !result.ok) {
        const detail = failureMessage(response.status, result);
        setNotice(detail);
        pushRecord({
          detail,
          orderNumber: result.order_number ?? submittedValue,
          status: "error",
          submittedValue
        });
        return;
      }

      const attendeeText = typeof result.attendee_count === "number" ? `${result.attendee_count} 人` : "参与者";
      const detail = `${attendeeText}已入场`;
      setNotice(`${result.order_number ?? submittedValue} 核销成功，${detail}。`);
      setInputValue("");
      pushRecord({
        detail,
        orderNumber: result.order_number ?? submittedValue,
        status: "success",
        submittedValue
      });
    } catch {
      setNotice("核销接口暂时不可用，请稍后重试。");
      pushRecord({
        detail: "接口不可用",
        orderNumber: submittedValue,
        status: "error",
        submittedValue
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="review-table-stack">
      <div className="review-toolbar">
        <strong>现场核销</strong>
        <span>输入订单号、核销码或 gatherup://check-in/ 链接。v0.1 暂不启用摄像头扫码。</span>
      </div>
      <form className="form-grid" onSubmit={submitCheckIn}>
        <label>
          订单号或核销码
          <input
            autoComplete="off"
            placeholder="例如 GU-ABC-00001 或 gatherup://check-in/..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button className="button primary" disabled={!canSubmit} type="submit">
            <LogIn size={16} />
            {isSubmitting ? "核销中" : "确认核销"}
          </button>
        </div>
      </form>
      {notice && <p className="inline-notice">{notice}</p>}
      {records.length > 0 && (
        <div className="data-table compact">
          <div className="table-row header">
            <span>时间</span><span>订单</span><span>结果</span><span>输入</span>
          </div>
          {records.map((record) => (
            <div className="table-row" key={record.id}>
              <span>{record.time}</span>
              <span>
                <strong>{record.orderNumber}</strong>
              </span>
              <span className={`status-badge ${record.status === "success" ? "success" : "warning"}`}>
                {record.status === "success" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {record.detail}
              </span>
              <small>{record.submittedValue}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
