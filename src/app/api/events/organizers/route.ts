import { NextResponse } from "next/server";

import { asRecord, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const roleMap = {
  联合主办: "cohost",
  财务: "finance",
  现场协作: "staff",
  只读: "viewer",
  cohost: "cohost",
  finance: "finance",
  staff: "staff",
  viewer: "viewer"
} as const;

function normalizeRole(value: string) {
  return roleMap[value as keyof typeof roleMap] ?? "cohost";
}

async function readOrganizerRequestBody(request: Request) {
  try {
    return asRecord(await request.json());
  } catch {
    return null;
  }
}

function statusForErrorCode(code: unknown) {
  const statusMap: Record<string, number> = {
    COLLABORATOR_NOT_FOUND: 404,
    CONCURRENT_CONFLICT: 409,
    DUPLICATE_COLLABORATOR: 409,
    EVENT_NOT_FOUND: 404,
    FORBIDDEN: 403,
    INVALID_ACTION: 400,
    MISSING_INPUT: 400,
    OWNER_PROTECTED: 409,
    OWNER_ROLE_FORBIDDEN: 400,
    UNAUTHORIZED: 401,
    USER_NOT_FOUND: 404
  };

  return typeof code === "string" ? statusMap[code] ?? 500 : 500;
}

async function manageOrganizer(request: Request, action: "add" | "remove" | "update") {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "events:organizers",
    limit: 20,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再管理协作者。", 401);
  }

  const body = await readOrganizerRequestBody(request);

  if (!body) {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const publicId = getString(body, ["public_id", "publicId", "gatherUpId"]).toUpperCase();
  const role = normalizeRole(getString(body, ["role"]));
  const canManagePayments = body.can_manage_payments === true || body.canManagePayments === true;
  const permissions = role === "cohost" && canManagePayments ? { can_manage_payments: true } : {};

  if (!eventId || !publicId) {
    return jsonError("缺少 event_id 或协作者 GatherUp ID。");
  }

  const { data, error } = await authContext.supabase.rpc("manage_event_organizer_atomic", {
    p_action: action,
    p_event_id: eventId,
    p_permissions: permissions,
    p_public_id: publicId,
    p_reason: getString(body, ["reason"]) || null,
    p_role: role,
    p_user_agent: request.headers.get("user-agent") ?? "unknown"
  });

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data?.success) {
    return jsonError(typeof data?.message === "string" ? data.message : "协作者管理失败。", statusForErrorCode(data?.error_code));
  }

  return NextResponse.json({ ok: true, result: data });
}

export async function POST(request: Request) {
  return manageOrganizer(request, "add");
}

export async function DELETE(request: Request) {
  return manageOrganizer(request, "remove");
}

export async function PATCH(request: Request) {
  return manageOrganizer(request, "update");
}
