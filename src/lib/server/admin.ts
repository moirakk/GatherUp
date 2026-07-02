import { type NextResponse } from "next/server";

import { findUserByAuthUserId, jsonError } from "@/lib/server/api";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

type AuthContext = NonNullable<Awaited<ReturnType<typeof getAuthenticatedSupabaseClient>>>;

export type PlatformAdminContext = {
  authContext: AuthContext;
  appUser: {
    id: string;
    public_id: string;
  };
};

export type PlatformAdminResult = PlatformAdminContext | { error: NextResponse };

export async function requirePlatformAdmin(request: Request): Promise<PlatformAdminResult> {
  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return { error: jsonError("请使用 Supabase 管理员账号登录。", 401) };
  }

  const { data: isAdmin, error } = await authContext.supabase.rpc("is_platform_admin");

  if (error || isAdmin !== true) {
    return { error: jsonError("只有平台管理员可以访问平台后台。", 403) };
  }

  const appUser = await findUserByAuthUserId(authContext.supabase, authContext.user.id);

  if (!appUser?.id) {
    return { error: jsonError("找不到当前 GatherUp 管理员资料。", 404) };
  }

  return { authContext, appUser };
}

export function hasPlatformAdminError(result: PlatformAdminResult): result is { error: NextResponse } {
  return "error" in result;
}
