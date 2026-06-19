import { NextResponse } from "next/server";

import { getAuthenticatedSupabaseClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const coreTables = [
  "events",
  "registrations",
  "payments",
  "payment_proofs",
  "refund_requests",
  "waitlist_entries",
  "notification_deliveries",
  "audit_logs"
];

function projectHost() {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : "";
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const publicEnvConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!publicEnvConfigured) {
    return NextResponse.json({
      ok: true,
      configured: false,
      project_host: "",
      authenticated: false,
      service_role_configured: serviceRoleConfigured,
      service_role_ready: false,
      checked_tables: [],
      failed_tables: []
    });
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        project_host: projectHost(),
        authenticated: false,
        service_role_configured: serviceRoleConfigured,
        service_role_ready: false,
        checked_tables: [],
        failed_tables: [],
        message: "请使用 Supabase 登录后再检查服务端连接状态。"
      },
      { status: 401 }
    );
  }

  if (!serviceRoleConfigured) {
    return NextResponse.json({
      ok: true,
      configured: true,
      project_host: projectHost(),
      authenticated: true,
      service_role_configured: false,
      service_role_ready: false,
      checked_tables: [],
      failed_tables: [],
      message: "SUPABASE_SERVICE_ROLE_KEY 未配置，服务端 schema 检查已跳过。"
    });
  }

  const supabase = getSupabaseServiceClient();
  const tableChecks = await Promise.all(
    coreTables.map(async (table) => {
      const { error } = await supabase.from(table).select("id", { head: true, count: "exact" });

      return {
        table,
        ok: !error,
        message: error?.message ?? ""
      };
    })
  );
  const failedTables = tableChecks.filter((tableCheck) => !tableCheck.ok);

  return NextResponse.json({
    ok: failedTables.length === 0,
    configured: true,
    project_host: projectHost(),
    authenticated: true,
    service_role_configured: true,
    service_role_ready: true,
    checked_tables: tableChecks.map((tableCheck) => tableCheck.table),
    failed_tables: failedTables,
    message: failedTables.length
      ? failedTables.map((tableCheck) => `${tableCheck.table}: ${tableCheck.message}`).join("；")
      : `服务端已检查 ${tableChecks.length} 张核心表。`
  });
}
