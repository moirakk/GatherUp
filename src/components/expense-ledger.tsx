"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

import { type EventExpense, type ExpenseCategory, type ExpenseStatus } from "@/lib/mock-data";
import { StatusBadge } from "@/components/status-badge";

type ExpenseLedgerProps = {
  expenses: EventExpense[];
};

const categories: ExpenseCategory[] = ["场地费", "物料采购", "餐饮茶歇", "设备租赁", "交通快递", "宣传设计", "其他"];
const statuses: ExpenseStatus[] = ["预算中", "已支付", "待报销"];

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString("zh-CN")}`;
}

export function ExpenseLedger({ expenses }: ExpenseLedgerProps) {
  const [rows, setRows] = useState(expenses);
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  function addExpense() {
    if (!draft.title.trim() || !draft.amount.trim()) {
      setNotice("请至少填写支出名称和金额。");
      return;
    }

    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setNotice("金额需要是有效数字。");
      return;
    }

    const newExpense: EventExpense = {
      id: `expense-${Date.now()}`,
      eventId: rows[0]?.eventId ?? "draft-event",
      title: draft.title.trim(),
      category: draft.category,
      amount,
      status: draft.status,
      paidBy: draft.paidBy.trim() || "未填写",
      proof: "pending",
      note: draft.note.trim() || "新添加支出",
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setRows((current) => [newExpense, ...current]);
    setDraft({
      title: "",
      category: categories[0],
      amount: "",
      paidBy: "",
      status: statuses[0],
      note: ""
    });
    setIsFormOpen(false);
    setNotice("支出已添加到当前页面。接入数据库后会长期保存。");
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
            <button className="button primary" type="button" onClick={addExpense}>
              <Plus size={16} />
              保存支出
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
