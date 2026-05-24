import { normalizeEmail, type AuthUser } from "@/lib/auth";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type SupabaseProfileRow = {
  id: string;
  auth_user_id: string;
  public_id: string;
  public_id_change_count: number;
  name: string;
  avatar_url: string | null;
  email: string | null;
  preferred_locale: string;
};

type EnsureProfileInput = {
  authUserId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  provider?: "email" | "google" | "apple" | "phone" | "wechat" | "line" | "kakao";
};

export type EnsureSupabaseProfileResult =
  | {
      ok: true;
      account: AuthUser;
      profile: SupabaseProfileRow;
    }
  | {
      ok: false;
      message: string;
    };

export type SupabaseProfileResult =
  | {
      ok: true;
      account: AuthUser;
      profile: SupabaseProfileRow;
    }
  | {
      ok: false;
      message: string;
    };

type UpdateProfileInput = {
  name?: string;
  publicId?: string;
};

function profileToAccount(profile: SupabaseProfileRow): AuthUser {
  return {
    email: profile.email ?? "",
    name: profile.name,
    gatherUpId: profile.public_id
  };
}

export function createStablePublicId(email: string, authUserId: string) {
  const prefix = normalizeEmail(email)
    .split("@")[0]
    .replace(/[^a-z0-9-]/gi, "")
    .slice(0, 8)
    .toUpperCase();
  const suffix = authUserId.replace(/-/g, "").slice(0, 5).toUpperCase();

  return `GU-${prefix || "USER"}-${suffix}`;
}

function mapProfileError(message?: string) {
  if (!message) {
    return "用户资料暂时无法同步，请稍后再试。";
  }

  if (message.includes("duplicate key")) {
    return "这个邮箱或 GatherUp ID 已经被使用。";
  }

  if (message.includes("violates row-level security")) {
    return "账号资料没有通过安全规则校验，请确认 Supabase RLS 策略已经更新。";
  }

  return message;
}

export async function ensureSupabaseProfile(input: EnsureProfileInput): Promise<EnsureSupabaseProfileResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "还没有配置 Supabase 环境变量，无法同步真实用户资料。"
    };
  }

  const supabase = getSupabaseBrowserClient();
  const normalizedEmail = normalizeEmail(input.email);
  const displayName = input.name.trim() || "GatherUp 用户";

  const existingResult = await supabase
    .from("users")
    .select("id, auth_user_id, public_id, public_id_change_count, name, avatar_url, email, preferred_locale")
    .eq("auth_user_id", input.authUserId)
    .maybeSingle();

  if (existingResult.error) {
    return {
      ok: false,
      message: mapProfileError(existingResult.error.message)
    };
  }

  if (existingResult.data) {
    const profile = existingResult.data as SupabaseProfileRow;
    const identityResult = await upsertPrimaryIdentity({
      userId: profile.id,
      provider: input.provider ?? "email",
      providerUserId: normalizedEmail,
      email: normalizedEmail,
      displayName,
      avatarUrl: input.avatarUrl
    });

    if (!identityResult.ok) {
      return identityResult;
    }

    return {
      ok: true,
      account: profileToAccount(profile),
      profile
    };
  }

  const insertResult = await supabase
    .from("users")
    .insert({
      auth_user_id: input.authUserId,
      public_id: createStablePublicId(normalizedEmail, input.authUserId),
      name: displayName,
      avatar_url: input.avatarUrl ?? null,
      email: normalizedEmail,
      preferred_locale: "zh-CN"
    })
    .select("id, auth_user_id, public_id, public_id_change_count, name, avatar_url, email, preferred_locale")
    .single();

  if (insertResult.error || !insertResult.data) {
    return {
      ok: false,
      message: mapProfileError(insertResult.error?.message)
    };
  }

  const profile = insertResult.data as SupabaseProfileRow;
  const identityResult = await upsertPrimaryIdentity({
    userId: profile.id,
    provider: input.provider ?? "email",
    providerUserId: normalizedEmail,
    email: normalizedEmail,
    displayName,
    avatarUrl: input.avatarUrl
  });

  if (!identityResult.ok) {
    return identityResult;
  }

  return {
    ok: true,
    account: profileToAccount(profile),
    profile
  };
}

export async function getCurrentSupabaseProfile(): Promise<SupabaseProfileResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "还没有配置 Supabase 环境变量，无法读取真实用户资料。"
    };
  }

  const supabase = getSupabaseBrowserClient();
  const userResult = await supabase.auth.getUser();

  if (userResult.error || !userResult.data.user) {
    return {
      ok: false,
      message: "当前 Supabase 登录状态已失效，请重新登录。"
    };
  }

  return getProfileByAuthUserId(userResult.data.user.id);
}

export async function updateCurrentSupabaseProfile(input: UpdateProfileInput): Promise<SupabaseProfileResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "还没有配置 Supabase 环境变量，无法保存真实用户资料。"
    };
  }

  const supabase = getSupabaseBrowserClient();
  const userResult = await supabase.auth.getUser();

  if (userResult.error || !userResult.data.user) {
    return {
      ok: false,
      message: "当前 Supabase 登录状态已失效，请重新登录。"
    };
  }

  const updates: { name?: string; public_id?: string } = {};

  if (input.name !== undefined) {
    updates.name = input.name.trim() || "GatherUp 用户";
  }

  if (input.publicId !== undefined) {
    updates.public_id = input.publicId;
  }

  const updateResult = await supabase
    .from("users")
    .update(updates)
    .eq("auth_user_id", userResult.data.user.id)
    .select("id, auth_user_id, public_id, public_id_change_count, name, avatar_url, email, preferred_locale")
    .single();

  if (updateResult.error || !updateResult.data) {
    return {
      ok: false,
      message: mapProfileError(updateResult.error?.message)
    };
  }

  const profile = updateResult.data as SupabaseProfileRow;

  return {
    ok: true,
    account: profileToAccount(profile),
    profile
  };
}

async function getProfileByAuthUserId(authUserId: string): Promise<SupabaseProfileResult> {
  const supabase = getSupabaseBrowserClient();
  const profileResult = await supabase
    .from("users")
    .select("id, auth_user_id, public_id, public_id_change_count, name, avatar_url, email, preferred_locale")
    .eq("auth_user_id", authUserId)
    .single();

  if (profileResult.error || !profileResult.data) {
    return {
      ok: false,
      message: mapProfileError(profileResult.error?.message)
    };
  }

  const profile = profileResult.data as SupabaseProfileRow;

  return {
    ok: true,
    account: profileToAccount(profile),
    profile
  };
}

async function upsertPrimaryIdentity(input: {
  userId: string;
  provider: NonNullable<EnsureProfileInput["provider"]>;
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.from("user_auth_identities").upsert(
    {
      user_id: input.userId,
      provider: input.provider,
      provider_user_id: input.providerUserId,
      email: input.email,
      display_name: input.displayName,
      avatar_url: input.avatarUrl ?? null,
      is_primary: true,
      verified_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString()
    },
    {
      onConflict: "provider,provider_user_id"
    }
  );

  if (error) {
    return {
      ok: false,
      message: mapProfileError(error.message)
    };
  }

  return {
    ok: true
  };
}
