import { NextResponse } from "next/server";

import { asRecord, canEditEvent, findUserByAuthUserId, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient, getSupabaseServiceClient } from "@/lib/supabase/server";

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

export async function POST(request: Request) {
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
    return jsonError("请使用 Supabase 登录后再添加协作者。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const publicId = getString(body, ["public_id", "publicId", "gatherUpId"]).toUpperCase();
  const role = normalizeRole(getString(body, ["role"]));
  const canManagePayments = body.can_manage_payments === true || body.canManagePayments === true;

  if (!eventId || !publicId) {
    return jsonError("缺少 event_id 或协作者 GatherUp ID。");
  }

  const canEdit = await canEditEvent(authContext.supabase, eventId);

  if (!canEdit) {
    return jsonError("只有活动主办或具备编辑权限的协作者可以添加协作者。", 403);
  }

  const service = getSupabaseServiceClient();
  const inviter = await findUserByAuthUserId(service, authContext.user.id);

  if (!inviter?.id) {
    return jsonError("找不到当前用户资料，请先完成账号资料同步。", 404);
  }

  const { data: invitedUser, error: userError } = await service
    .from("users")
    .select("id, public_id, name")
    .eq("public_id", publicId)
    .single();

  if (userError || !invitedUser?.id) {
    return jsonError("没有找到这个 GatherUp ID 对应的用户。", 404);
  }

  const permissions = role === "cohost" && canManagePayments ? { can_manage_payments: true } : {};
  const { data: organizer, error } = await service
    .from("event_organizers")
    .upsert(
      {
        event_id: eventId,
        user_id: invitedUser.id,
        role,
        permissions,
        invited_by: inviter.id,
        updated_at: new Date().toISOString()
      },
      { onConflict: "event_id,user_id" }
    )
    .select("event_id, role, users(id, public_id, name)")
    .single();

  if (error || !organizer) {
    return jsonError(error?.message ?? "协作者添加失败。", 500);
  }

  return NextResponse.json({
    ok: true,
    organizer
  });
}
