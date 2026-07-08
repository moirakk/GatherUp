import { NextResponse } from "next/server";

import { asRecord, canManageEventFinance, findUserByAuthUserId, getNumber, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const categoryMap: Record<string, string> = {
  场地费: "venue",
  物料采购: "materials",
  餐饮茶歇: "food",
  设备租赁: "equipment",
  交通快递: "transport",
  宣传设计: "marketing",
  其他: "other"
};

const statusMap: Record<string, string> = {
  预算中: "budgeted",
  已支付: "paid",
  待报销: "reimbursable"
};

const publicCategoryMap: Record<string, string> = Object.fromEntries(Object.entries(categoryMap).map(([label, value]) => [value, label]));
const publicStatusMap: Record<string, string> = Object.fromEntries(Object.entries(statusMap).map(([label, value]) => [value, label]));

function normalizeCategory(value: string) {
  return categoryMap[value] ?? (value || "other");
}

function normalizeStatus(value: string) {
  return statusMap[value] ?? (value || "budgeted");
}

function toExpenseResponse(item: Record<string, unknown>, paidBy: string) {
  return {
    id: item.id,
    eventId: item.event_id,
    category: publicCategoryMap[String(item.category)] ?? "其他",
    title: item.title,
    amount: Math.round(Number(item.amount_cents ?? 0) / 100),
    status: publicStatusMap[String(item.status)] ?? "预算中",
    paidBy,
    proof: item.proof_url ?? "pending",
    note: item.note ?? "活动支出",
    createdAt: String(item.created_at ?? "").slice(0, 10)
  };
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "expenses:create",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再记录活动支出。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const title = getString(body, ["title"]);
  const amount = getNumber(body, ["amount"], Number.NaN);
  const note = getString(body, ["note"]);
  const category = normalizeCategory(getString(body, ["category"]));
  const status = normalizeStatus(getString(body, ["status"]));

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (!title) {
    return jsonError("请填写支出名称。");
  }

  if (!Number.isFinite(amount) || amount < 0) {
    return jsonError("金额需要是有效数字。");
  }

  const canManage = await canManageEventFinance(authContext.supabase, eventId);

  if (!canManage) {
    return jsonError("只有活动主办或财务协作者可以记录支出。", 403);
  }

  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);

  if (!appUser?.id) {
    return jsonError("找不到当前 GatherUp 用户资料，请先完成账号同步。", 404);
  }

  const { data, error } = await authContext.supabase
    .from("event_expenses")
    .insert({
      event_id: eventId,
      category,
      title,
      amount_cents: Math.round(amount * 100),
      status,
      paid_by: appUser.id,
      note: note || null
    })
    .select("id, event_id, category, title, amount_cents, status, paid_by, proof_url, note, created_at")
    .single();

  if (error) {
    return jsonError(error.message, 403);
  }

  return NextResponse.json({
    ok: true,
    expense: toExpenseResponse(data as Record<string, unknown>, appUser.public_id)
  });
}
