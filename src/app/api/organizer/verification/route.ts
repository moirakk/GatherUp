import { NextResponse } from "next/server";

import { asRecord, findUserByAuthUserId, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const approvedStatuses = new Set(["light_verified", "enhanced_verified"]);

function toPublicVerification(row: Record<string, unknown> | null) {
  if (!row) {
    return {
      status: "not_applied",
      contact_email: null,
      contact_phone: null,
      community_account: null,
      past_event_summary: null,
      force_review_required: false,
      review_note: null
    };
  }

  return {
    status: String(row.status ?? "not_applied"),
    contact_email: row.contact_email ?? null,
    contact_phone: row.contact_phone ?? null,
    community_account: row.community_account ?? null,
    past_event_summary: row.past_event_summary ?? null,
    force_review_required: row.force_review_required === true,
    review_note: row.review_note ?? null
  };
}

export async function GET(request: Request) {
  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再查看主办认证状态。", 401);
  }

  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);

  if (!appUser?.id) {
    return jsonError("找不到当前 GatherUp 用户资料，请先完成账号同步。", 404);
  }

  const { data, error } = await authContext.supabase
    .from("organizer_verifications")
    .select("status, contact_email, contact_phone, community_account, past_event_summary, force_review_required, review_note")
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 403);
  }

  return NextResponse.json({
    ok: true,
    verification: toPublicVerification((data as Record<string, unknown> | null) ?? null)
  });
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "organizer:verification",
    limit: 10,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再提交主办认证。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const contactEmail = getString(body, ["contact_email", "contactEmail"]);
  const contactPhone = getString(body, ["contact_phone", "contactPhone"]);
  const communityAccount = getString(body, ["community_account", "communityAccount"]);
  const pastEventSummary = getString(body, ["past_event_summary", "pastEventSummary", "summary"]);

  if (!contactEmail && !contactPhone) {
    return jsonError("请至少填写一个联系邮箱或手机号。");
  }

  if (pastEventSummary.length < 12) {
    return jsonError("请简要说明过往活动经验，至少 12 个字符。");
  }

  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);

  if (!appUser?.id) {
    return jsonError("找不到当前 GatherUp 用户资料，请先完成账号同步。", 404);
  }

  const { data: existing, error: existingError } = await authContext.supabase
    .from("organizer_verifications")
    .select("status, force_review_required")
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (existingError) {
    return jsonError(existingError.message, 403);
  }

  if (existing?.status === "suspended") {
    return jsonError("当前主办认证已暂停，请联系平台处理。", 403);
  }

  if (approvedStatuses.has(String(existing?.status)) && existing?.force_review_required !== true) {
    return jsonError("你的主办认证已通过，无需重复提交。", 409);
  }

  const { data, error } = await authContext.supabase
    .from("organizer_verifications")
    .upsert(
      {
        user_id: appUser.id,
        status: "pending",
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        community_account: communityAccount || null,
        past_event_summary: pastEventSummary,
        submitted_materials: {},
        review_note: null
      },
      { onConflict: "user_id" }
    )
    .select("status, contact_email, contact_phone, community_account, past_event_summary, force_review_required, review_note")
    .single();

  if (error || !data) {
    return jsonError(error?.message ?? "主办认证提交失败。", 500);
  }

  return NextResponse.json({
    ok: true,
    verification: toPublicVerification(data as Record<string, unknown>)
  });
}
