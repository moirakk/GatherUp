import { isSupabaseConfigured } from "@/lib/supabase/client";

export function isDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_GATHERUP_DEMO_MODE === "1";
}

export function shouldUseMockData() {
  return !isSupabaseConfigured() || isDemoModeEnabled();
}

export function reportDataAccessFailure(scope: string, error: unknown) {
  console.error(`[gatherup:data] ${scope} failed`, error);
}
