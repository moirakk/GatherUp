import { NextResponse } from "next/server";

import { asRecord, canManageEventFinance, findUserByAuthUserId, getString, jsonError } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeStoragePath(value: string) {
  return value.replace(/^\/+/, "").replace(/^expense-proofs\//, "");
}

function pathMatchesExpenseProof(path: string, eventId: string, expenseId: string) {
  const parts = path.split("/");

  return parts.length >= 3 && parts[0] === eventId && parts[1] === expenseId && Boolean(parts[2]);
}

async function writeExpenseProofAudit({
  action,
  actorId,
  eventId,
  expenseId,
  beforeProofUrl,
  afterProofUrl,
  request,
  storagePath
}: {
  action: "expense_proof.uploaded" | "expense_proof.voided";
  actorId: string;
  eventId: string;
  expenseId: string;
  beforeProofUrl: string | null;
  afterProofUrl: string | null;
  request: Request;
  storagePath: string;
}) {
  const serviceSupabase = getSupabaseServiceClient();

  const { error } = await serviceSupabase.from("audit_logs").insert({
    actor_id: actorId,
    actor_role: "finance_manager",
    event_id: eventId,
    target_type: "event_expense",
    target_id: expenseId,
    action,
    risk_level: "medium",
    reason: action === "expense_proof.voided" ? "Expense proof voided by finance manager" : "Expense proof uploaded by finance manager",
    before_snapshot: {
      proof_url: beforeProofUrl
    },
    after_snapshot: {
      proof_url: afterProofUrl
    },
    metadata: {
      bucket: "expense-proofs",
      storagePath
    },
    user_agent: request.headers.get("user-agent") ?? "unknown"
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "expenses:proof",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再提交支出凭证。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const expenseId = getString(body, ["expense_id", "expenseId"]);
  const storagePath = normalizeStoragePath(getString(body, ["storage_path", "storagePath", "file_url", "fileUrl"]));

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (!expenseId) {
    return jsonError("缺少 expense_id。");
  }

  if (!storagePath) {
    return jsonError("缺少支出凭证存储路径。");
  }

  const canManage = await canManageEventFinance(authContext.supabase, eventId);

  if (!canManage) {
    return jsonError("只有活动主办或财务协作者可以提交支出凭证。", 403);
  }

  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);

  if (!appUser?.id) {
    return jsonError("找不到当前用户资料，无法记录支出凭证审计。", 404);
  }

  const { data: expense, error: expenseError } = await authContext.supabase
    .from("event_expenses")
    .select("id, event_id, proof_url")
    .eq("id", expenseId)
    .eq("event_id", eventId)
    .single();

  if (expenseError || !expense?.id) {
    return jsonError("找不到可处理的支出记录。", 404);
  }

  if (!pathMatchesExpenseProof(storagePath, eventId, expense.id)) {
    return jsonError("支出凭证路径与支出记录不匹配。", 400);
  }

  const { data: storedObject, error: storedObjectError } = await authContext.supabase
    .schema("storage")
    .from("objects")
    .select("id")
    .eq("bucket_id", "expense-proofs")
    .eq("name", storagePath)
    .maybeSingle();

  if (storedObjectError || !storedObject?.id) {
    return jsonError("找不到已上传的支出凭证文件。", 404);
  }

  const { data: updatedExpense, error: updateError } = await authContext.supabase
    .from("event_expenses")
    .update({
      proof_url: storagePath
    })
    .eq("id", expense.id)
    .eq("event_id", eventId)
    .select("id, proof_url")
    .single();

  if (updateError || !updatedExpense?.id) {
    return jsonError(updateError?.message ?? "支出凭证已上传，但凭证状态更新失败。", 500);
  }

  try {
    await writeExpenseProofAudit({
      action: "expense_proof.uploaded",
      actorId: appUser.id,
      eventId,
      expenseId: updatedExpense.id,
      beforeProofUrl: typeof expense.proof_url === "string" ? expense.proof_url : null,
      afterProofUrl: updatedExpense.proof_url,
      request,
      storagePath
    });
  } catch (error) {
    return jsonError(error instanceof Error ? `支出凭证已更新，但审计日志写入失败：${error.message}` : "支出凭证已更新，但审计日志写入失败。", 500);
  }

  return NextResponse.json({
    ok: true,
    expense_id: updatedExpense.id,
    proof_url: updatedExpense.proof_url
  });
}

export async function DELETE(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "expenses:proof",
    limit: 30,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再作废支出凭证。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventId = getString(body, ["event_id", "eventId"]);
  const expenseId = getString(body, ["expense_id", "expenseId"]);

  if (!eventId) {
    return jsonError("缺少 event_id。");
  }

  if (!expenseId) {
    return jsonError("缺少 expense_id。");
  }

  const canManage = await canManageEventFinance(authContext.supabase, eventId);

  if (!canManage) {
    return jsonError("只有活动主办或财务协作者可以作废支出凭证。", 403);
  }

  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);

  if (!appUser?.id) {
    return jsonError("找不到当前用户资料，无法记录支出凭证审计。", 404);
  }

  const { data: expense, error: expenseError } = await authContext.supabase
    .from("event_expenses")
    .select("id, event_id, proof_url")
    .eq("id", expenseId)
    .eq("event_id", eventId)
    .single();

  if (expenseError || !expense?.id) {
    return jsonError("找不到可处理的支出记录。", 404);
  }

  if (!expense.proof_url) {
    return jsonError("该支出记录暂无可作废凭证。", 409);
  }

  const { data: updatedExpense, error: updateError } = await authContext.supabase
    .from("event_expenses")
    .update({
      proof_url: null
    })
    .eq("id", expense.id)
    .eq("event_id", eventId)
    .eq("proof_url", expense.proof_url)
    .select("id, proof_url")
    .single();

  if (updateError || !updatedExpense?.id) {
    return jsonError(updateError?.message ?? "支出凭证作废失败。", 500);
  }

  try {
    await writeExpenseProofAudit({
      action: "expense_proof.voided",
      actorId: appUser.id,
      eventId,
      expenseId: updatedExpense.id,
      beforeProofUrl: expense.proof_url,
      afterProofUrl: null,
      request,
      storagePath: expense.proof_url
    });
  } catch (error) {
    return jsonError(error instanceof Error ? `支出凭证已作废，但审计日志写入失败：${error.message}` : "支出凭证已作废，但审计日志写入失败。", 500);
  }

  return NextResponse.json({
    ok: true,
    expense_id: updatedExpense.id,
    proof_url: updatedExpense.proof_url ?? "pending"
  });
}
