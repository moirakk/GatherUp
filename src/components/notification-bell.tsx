"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  template_key: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationResponse = {
  ok: boolean;
  unread_count?: number;
  notifications?: NotificationItem[];
  message?: string;
};

async function getAccessToken() {
  if (!isSupabaseConfigured()) {
    return "";
  }

  const {
    data: { session }
  } = await getSupabaseBrowserClient().auth.getSession();

  return session?.access_token ?? "";
}

function formatNotificationTime(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(timestamp);
}

export function NotificationBell({ enabled }: { enabled: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [message, setMessage] = useState("");

  const hasUnread = unreadCount > 0;
  const visibleUnreadCount = useMemo(() => (unreadCount > 99 ? "99+" : String(unreadCount)), [unreadCount]);

  async function requestNotifications() {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/notifications?limit=10", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });
      const result = (await response.json()) as NotificationResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "通知暂时不可用。");
        return;
      }

      setUnreadCount(result.unread_count ?? 0);
      setNotifications(result.notifications ?? []);
    } catch {
      setMessage("通知暂时不可用。");
    } finally {
      setIsLoading(false);
    }
  }

  async function markAllRead() {
    if (!enabled || unreadCount === 0) {
      return;
    }

    setIsUpdating(true);
    setMessage("");

    try {
      const accessToken = await getAccessToken();
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ all: true })
      });
      const result = (await response.json()) as NotificationResponse;

      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "通知状态更新失败。");
        return;
      }

      setUnreadCount(0);
      setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    } catch {
      setMessage("通知状态更新失败。");
    } finally {
      setIsUpdating(false);
    }
  }

  useEffect(() => {
    requestNotifications();
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="notification-menu">
      <button
        className={`icon-button notification-trigger${hasUnread ? " has-unread" : ""}`}
        type="button"
        aria-label={`通知${hasUnread ? `，${unreadCount} 条未读` : ""}`}
        aria-expanded={isOpen}
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) {
            requestNotifications();
          }
        }}
      >
        <Bell size={18} />
        {hasUnread ? <span className="notification-badge">{visibleUnreadCount}</span> : null}
      </button>

      {isOpen ? (
        <section className="notification-popover" aria-label="站内通知">
          <div className="notification-popover-header">
            <div>
              <strong>通知</strong>
              <span>{hasUnread ? `${unreadCount} 条未读` : "暂无未读"}</span>
            </div>
            <button className="icon-button small" type="button" aria-label="全部标为已读" disabled={!hasUnread || isUpdating} onClick={markAllRead}>
              {isUpdating ? <Loader2 size={15} className="spin" /> : <CheckCheck size={16} />}
            </button>
          </div>

          {message ? <p className="notification-message">{message}</p> : null}

          {isLoading ? (
            <div className="notification-empty">
              <Loader2 size={18} className="spin" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="notification-list">
              {notifications.map((item) => (
                <article className={`notification-item${item.read_at ? "" : " unread"}`} key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <time>{formatNotificationTime(item.created_at)}</time>
                  </div>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="notification-empty">暂无通知</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
