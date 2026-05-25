"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

export function EventReminderButton() {
  const [notice, setNotice] = useState("");

  return (
    <div className="participant-action-stack">
      {notice && <p className="inline-notice">{notice}</p>}
      <button
        className="button secondary full"
        type="button"
        onClick={() => setNotice("已记录提醒意向。正式版会通过站内消息、邮箱或微信提醒你。")}
      >
        <Bell size={17} />
        报名开放时提醒我
      </button>
    </div>
  );
}
