import { NextResponse } from "next/server";

import { hasPlatformAdminError, requirePlatformAdmin } from "@/lib/server/admin";
import { processPendingEmailNotifications } from "@/lib/server/email-notifications";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "notifications:send-email",
    limit: 10,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const adminCheck = await requirePlatformAdmin(request);

  if (hasPlatformAdminError(adminCheck)) {
    return adminCheck.error;
  }

  const serviceSupabase = getSupabaseServiceClient();
  const results = await processPendingEmailNotifications(serviceSupabase);

  return NextResponse.json({
    ok: true,
    processed_count: results.length,
    sent_count: results.filter((result) => result.ok).length,
    failed_count: results.filter((result) => !result.ok).length,
    results
  });
}
