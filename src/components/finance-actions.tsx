"use client";

import { Plus } from "lucide-react";

export function FinanceActions() {
  function openExpenseForm() {
    window.dispatchEvent(new CustomEvent("gatherup:open-expense-form"));
  }

  return (
    <button className="button primary" type="button" onClick={openExpenseForm}>
      <Plus size={17} />
      添加支出
    </button>
  );
}
