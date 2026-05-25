"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export function FinanceActions() {
  const [notice, setNotice] = useState("");

  return (
    <>
      <button
        className="button primary"
        type="button"
        onClick={() => setNotice("支出表单已规划：下一版会打开弹窗，填写分类、金额、经办人和凭证。")}
      >
        <Plus size={17} />
        添加支出
      </button>
      {notice && <span className="button-feedback">{notice}</span>}
    </>
  );
}
