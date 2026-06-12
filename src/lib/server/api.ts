import { randomBytes, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";

import { getAuthSession, type AuthSession } from "@/lib/auth";

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

export function requireApiSession(request: Request): AuthSession | NextResponse {
  const session = getAuthSession(request.headers.get("cookie") ?? "");

  if (!session?.gatherUpId) {
    return jsonError("请先登录后再继续。", 401);
  }

  return session;
}

export function isApiErrorResponse(value: AuthSession | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
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

export async function findUserByPublicId(supabase: SupabaseClient, publicId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, public_id")
    .eq("public_id", publicId.toUpperCase())
    .single();

  if (error || !data?.id) {
    return null;
  }

  return data as { id: string; public_id: string };
}

export async function canManageEventByPublicId(supabase: SupabaseClient, eventId: string, publicId: string) {
  const user = await findUserByPublicId(supabase, publicId);

  if (!user) {
    return false;
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, organizer_id")
    .eq("id", eventId)
    .single();

  if (event?.organizer_id === user.id) {
    return true;
  }

  const { data: organizer } = await supabase
    .from("event_organizers")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .in("role", ["owner", "cohost", "finance", "staff"])
    .maybeSingle();

  return Boolean(organizer?.id);
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
