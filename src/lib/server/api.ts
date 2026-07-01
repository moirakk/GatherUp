import { randomBytes, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";

export type JsonRecord = Record<string, unknown>;

export const orderStatus = {
  pending: "payment_submitted",
  approved: "confirmed",
  rejected: "payment_rejected_resubmittable"
} as const;

export const checkInStatus = {
  notArrived: "not_arrived",
  checkedIn: "arrived"
} as const;

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

export function getString(source: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function getNumber(source: JsonRecord, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = source[key];
    const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return fallback;
}

export function normalizeJsonInput(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return {};
    }

    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return { text: trimmed };
    }
  }

  if (value === undefined || value === null || value === "") {
    return {};
  }

  return value;
}

export async function findUserByAuthUserId(supabase: SupabaseClient, authUserId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, public_id")
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !data?.id) {
    return null;
  }

  return data as { id: string; public_id: string };
}

export async function canManageEvent(supabase: SupabaseClient, eventId: string) {
  const { data, error } = await supabase.rpc("can_manage_event", {
    target_event_id: eventId
  });

  if (error) {
    return false;
  }

  return data === true;
}

export async function canManageEventFinance(supabase: SupabaseClient, eventId: string) {
  const { data, error } = await supabase.rpc("can_manage_event_finance", {
    target_event_id: eventId
  });

  if (error) {
    return false;
  }

  return data === true;
}

export async function canEditEvent(supabase: SupabaseClient, eventId: string) {
  const { data, error } = await supabase.rpc("can_edit_event", {
    target_event_id: eventId
  });

  if (error) {
    return false;
  }

  return data === true;
}

export function generateCheckInCode() {
  return `${randomUUID().replaceAll("-", "")}${randomBytes(12).toString("hex")}`;
}

export function normalizeReviewDecision(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "APPROVED" : "REJECTED";
  }

  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toUpperCase();

  if (["APPROVED", "APPROVE", "PASS", "PASSED", "通过"].includes(normalized)) {
    return "APPROVED";
  }

  if (["REJECTED", "REJECT", "DENY", "DENIED", "驳回", "拒绝"].includes(normalized)) {
    return "REJECTED";
  }

  return normalized;
}

export function toPublicOrderStatus(status: string | null | undefined) {
  if (status === orderStatus.approved) return "APPROVED";
  if (status === orderStatus.rejected) return "REJECTED";
  return "PENDING";
}

export function toPublicCheckInStatus(status: string | null | undefined) {
  if (status === checkInStatus.checkedIn) return "CHECKED_IN";
  return "NOT_ARRIVED";
}
