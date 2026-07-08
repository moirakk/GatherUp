import { NextResponse } from "next/server";

import { asRecord, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeStatus(value: string) {
  return value === "draft" ? "draft" : "published";
}

function toAnnouncementResponse(item: Record<string, unknown>) {
  return {
    id: item.id,
    event_id: item.event_id,
    title: item.title,
    body: item.body,
    status: item.status,
    published_at: item.published_at,
    created_at: item.created_at
  };
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "announcements:create",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再发布通知。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const title = getString(body, ["title"]);
  const content = getString(body, ["body", "content"]);
  const status = normalizeStatus(getString(body, ["status"]));

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (!title || !content) {
    return jsonError("请填写通知标题和内容。");
  }

  const { data, error } = await authContext.supabase
    .from("announcements")
    .insert({
      event_id: eventId,
      title,
      body: content,
      status,
      published_at: status === "published" ? new Date().toISOString() : null
    })
    .select("id, event_id, title, body, status, published_at, created_at")
    .single();

  if (error) {
    return jsonError(error.message, 403);
  }

  return NextResponse.json({
    ok: true,
    announcement: toAnnouncementResponse(data as Record<string, unknown>)
  });
}
