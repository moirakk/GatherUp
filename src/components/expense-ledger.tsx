"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

import { type EventExpense, type ExpenseCategory, type ExpenseStatus } from "@/lib/mock-data";
import { StatusBadge } from "@/components/status-badge";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type ExpenseLedgerProps = {
  eventId: string;
  expenses: EventExpense[];
};

const categories: ExpenseCategory[] = ["场地费", "物料采购", "餐饮茶歇", "设备租赁", "交通快递", "宣传设计", "其他"];
const statuses: ExpenseStatus[] = ["预算中", "已支付", "待报销"];

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString("zh-CN")}`;
}

export function ExpenseLedger({ eventId, expenses }: ExpenseLedgerProps) {
  const [rows, setRows] = useState(expenses);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({
    title: "",
    category: categories[0],
    amount: "",
    paidBy: "",
    status: statuses[0],
    note: ""
  });

  useEffect(() => {
    setRows(expenses);
  }, [expenses]);

  useEffect(() => {
    function openForm() {
      setIsFormOpen(true);
      setNotice("");
    }

    window.addEventListener("gatherup:open-expense-form", openForm);
    return () => window.removeEventListener("gatherup:open-expense-form", openForm);
  }, []);

  function updateDraft(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function resetDraft() {
    setDraft({
      title: "",
      category: categories[0],
      amount: "",
      paidBy: "",
      status: statuses[0],
      note: ""
    });
  }

  function buildLocalExpense(amount: number): EventExpense {
    return {
      id: `expense-${Date.now()}`,
      eventId,
      title: draft.title.trim(),
      category: draft.category,
      amount,
      status: draft.status,
      paidBy: draft.paidBy.trim() || "未填写",
      proof: "pending",
      note: draft.note.trim() || "新添加支出",
      createdAt: new Date().toISOString().slice(0, 10)
    };
  }

  async function addExpense() {
    if (!draft.title.trim() || !draft.amount.trim()) {
      setNotice("请至少填写支出名称和金额。");
      return;
    }

    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setNotice("金额需要是有效数字。");
      return;
    }

    if (!isSupabaseConfigured()) {
      const newExpense = buildLocalExpense(amount);
      setRows((current) => [newExpense, ...current]);
      resetDraft();
      setIsFormOpen(false);
      setNotice("本地演示模式：支出已添加到当前页面，不会长期保存。");
      return;
    }

    setIsSaving(true);
    setNotice("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          event_id: eventId,
          title: draft.title.trim(),
          category: draft.category,
          amount,
          status: draft.status,
          note: [draft.note.trim(), draft.paidBy.trim() ? `经办人：${draft.paidBy.trim()}` : ""].filter(Boolean).join("；")
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok || !payload.expense) {
        setNotice(typeof payload?.message === "string" ? payload.message : "支出保存失败，请稍后重试。");
        return;
      }

      setRows((current) => [payload.expense as EventExpense, ...current]);
      resetDraft();
      setIsFormOpen(false);
      setNotice("支出已保存到 Supabase 财务记录。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "支出保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="ledger-stack">
      {notice && <p className="inline-notice">{notice}</p>}
      {isFormOpen && (
        <div className="expense-form">
          <div className="section-heading">
            <strong>新增支出</strong>
            <button className="icon-button compact-icon" type="button" onClick={() => setIsFormOpen(false)} aria-label="关闭新增支出">
              <X size={16} />
            </button>
          </div>
          <div className="form-grid two-column">
            <label>支出名称<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></label>
            <label>分类<select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>金额<input inputMode="decimal" value={draft.amount} onChange={(event) => updateDraft("amount", event.target.value)} /></label>
            <label>经办人<input value={draft.paidBy} onChange={(event) => updateDraft("paidBy", event.target.value)} /></label>
            <label>状态<select value={draft.status} onChange={(event) => updateDraft("status", event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label>备注<input value={draft.note} onChange={(event) => updateDraft("note", event.target.value)} /></label>
          </div>
          <div className="button-row">
            <button className="button primary" type="button" onClick={addExpense} disabled={isSaving}>
              <Plus size={16} />
              {isSaving ? "保存中" : "保存支出"}
            </button>
            <button className="button secondary" type="button" onClick={() => setIsFormOpen(false)}>
              取消
            </button>
          </div>
        </div>
      )}
      <div className="data-table compact">
        <div className="table-row header">
          <span>支出</span><span>分类</span><span>金额</span><span>经办</span><span>状态</span>
        </div>
        {rows.map((expense) => (
          <div className="table-row" key={expense.id}>
            <span>
              <strong>{expense.title}</strong>
              <small>{expense.note}</small>
            </span>
            <span>{expense.category}</span>
            <span>{formatMoney(expense.amount)}</span>
            <span>{expense.paidBy}</span>
            <StatusBadge>{expense.status}</StatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
}
