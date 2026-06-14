"use client";

import { useMemo, useState } from "react";
import { Armchair, CheckCircle2, Clock3 } from "lucide-react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { OrderAttendeeOption, OrderSeatOption } from "@/lib/orders-data";

type OrderSeatSelectionPanelProps = {
  attendees: OrderAttendeeOption[];
  registrationId: string;
  seats: OrderSeatOption[];
};

type SeatLockResult = {
  ok?: boolean;
  message?: string;
  seat_lock_id?: string;
  seat_label?: string;
  expires_at?: string;
};

type SeatConfirmResult = {
  ok?: boolean;
  message?: string;
  seat_assignment_id?: string;
  seat_label?: string;
};

async function getAccessToken() {
  return isSupabaseConfigured()
    ? (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token
    : "";
}

export function OrderSeatSelectionPanel({ attendees, registrationId, seats }: OrderSeatSelectionPanelProps) {
  const firstUnseatedAttendee = useMemo(() => attendees.find((attendee) => !attendee.seatLabel), [attendees]);
  const firstAvailableSeat = useMemo(() => seats.find((seat) => seat.status === "available"), [seats]);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState(firstUnseatedAttendee?.id ?? attendees[0]?.id ?? "");
  const [selectedSeatId, setSelectedSeatId] = useState(firstAvailableSeat?.id ?? "");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedAttendee = attendees.find((attendee) => attendee.id === selectedAttendeeId);
  const selectableSeats = seats.filter((seat) => seat.status === "available" || seat.id === selectedSeatId);

  async function lockAndConfirmSeat() {
    setNotice("");

    if (!selectedAttendeeId || !selectedSeatId) {
      setNotice("请先选择参与人和可用座位。");
      return;
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      setNotice("真实选座需要先使用 Supabase 账号登录。");
      return;
    }

    setIsSubmitting(true);

    try {
      const lockResponse = await fetch("/api/seats/lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          registration_id: registrationId,
          seat_id: selectedSeatId
        })
      });
      const lockResult = (await lockResponse.json()) as SeatLockResult;

      if (!lockResponse.ok || !lockResult.ok || !lockResult.seat_lock_id) {
        setNotice(lockResult.message ?? "座位锁定失败，请刷新后重试。");
        return;
      }

      const confirmResponse = await fetch("/api/seats/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          seat_lock_id: lockResult.seat_lock_id,
          attendee_id: selectedAttendeeId
        })
      });
      const confirmResult = (await confirmResponse.json()) as SeatConfirmResult;

      if (!confirmResponse.ok || !confirmResult.ok) {
        setNotice(confirmResult.message ?? "座位确认失败，请刷新后重试。");
        return;
      }

      setNotice(`${selectedAttendee?.label ?? "参与人"} 已确认座位 ${confirmResult.seat_label ?? lockResult.seat_label ?? "已选座"}。`);
    } catch {
      setNotice("选座接口暂时不可用，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="content-card">
      <div className="section-heading">
        <div>
          <h2>真实选座</h2>
          <p className="subtle">付款确认后可以为参与人锁定座位。座位锁和最终分配由数据库 RPC 保证并发一致性。</p>
        </div>
        <Armchair size={20} />
      </div>

      <div className="form-grid">
        <label>
          参与人
          <select value={selectedAttendeeId} onChange={(event) => setSelectedAttendeeId(event.target.value)}>
            {attendees.map((attendee) => (
              <option key={attendee.id} value={attendee.id}>
                {attendee.label}{attendee.seatLabel ? ` · 已选 ${attendee.seatLabel}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          可选座位
          <select value={selectedSeatId} onChange={(event) => setSelectedSeatId(event.target.value)}>
            {selectableSeats.length ? (
              selectableSeats.map((seat) => (
                <option key={seat.id} value={seat.id}>
                  {seat.label}
                </option>
              ))
            ) : (
              <option value="">暂无可选座位</option>
            )}
          </select>
        </label>
      </div>

      <div className="notice-list">
        <div><Clock3 size={16} />座位锁默认按活动配置过期；确认成功后会写入最终座位分配。</div>
        <div><CheckCircle2 size={16} />如果多人同时选择同一座位，数据库唯一约束会只允许一个成功。</div>
      </div>

      {notice && <p className="validation-note">{notice}</p>}

      <button className="button primary" type="button" disabled={isSubmitting || !selectableSeats.length} onClick={lockAndConfirmSeat}>
        {isSubmitting ? "正在确认座位..." : "锁定并确认座位"}
      </button>
    </article>
  );
}
