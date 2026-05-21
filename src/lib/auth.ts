export type AuthProvider = "email" | "google" | "apple" | "phone" | "wechat" | "line" | "kakao";

export type AuthUser = {
  email: string;
  name: string;
  gatherUpId: string;
};

export type AuthSession = AuthUser & {
  sessionType: "demo";
};

export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  gatherUpId: string;
  description: string;
};

export type AuthProviderOption = {
  provider: AuthProvider;
  label: string;
  description: string;
  availability: "ready" | "planned";
};

export type PasswordSignInResult =
  | {
      ok: true;
      account: DemoAccount;
    }
  | {
      ok: false;
      message: string;
    };

export const authProviderOptions: AuthProviderOption[] = [
  {
    provider: "email",
    label: "邮箱",
    description: "全球账号底座",
    availability: "ready"
  },
  {
    provider: "google",
    label: "Google / Apple",
    description: "全球快捷登录",
    availability: "planned"
  },
  {
    provider: "wechat",
    label: "微信 / 手机号",
    description: "地区化增强",
    availability: "planned"
  }
];

export const authStrategyNotes = [
  "邮箱账号可以跨国家、跨设备、跨平台找回。",
  "Google、Apple、微信等只是登录方式，都会绑定到同一个 GatherUp 用户。",
  "活动、订单、付款截图和管理权限都绑定到稳定的用户 ID。"
];

export const PUBLIC_ID_STORAGE_KEY = "gatherup_public_id";
export const PUBLIC_ID_CHANGE_COUNT_STORAGE_KEY = "gatherup_id_change_count";

export const maxPublicIdChanges = 2;

export const publicIdPattern = /^GU-[A-Z0-9-]{3,18}$/;

export function normalizePublicId(value: string) {
  return value.trim().toUpperCase();
}

export const SESSION_COOKIE = "gatherup_session";
export const USER_COOKIE = "gatherup_user";
export const NAME_COOKIE = "gatherup_name";
export const ID_COOKIE = "gatherup_id";

export const demoAccounts: DemoAccount[] = [
  {
    email: "miki@gatherup.local",
    password: "gatherup123",
    name: "比奇堡miki",
    gatherUpId: "GU-MIKI",
    description: "同一个账号可参与活动、查看订单，也可以创建和管理自己的活动。"
  }
];

export function findDemoAccount(email: string) {
  return demoAccounts.find((account) => account.email.toLowerCase() === email.trim().toLowerCase());
}

function readCookieValue(source: string, name: string) {
  const pair = source
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!pair) {
    return "";
  }

  return decodeURIComponent(pair.slice(name.length + 1));
}

export function getAuthSession(cookieSource: string): AuthSession | null {
  const hasSession = Boolean(readCookieValue(cookieSource, SESSION_COOKIE));

  if (!hasSession) {
    return null;
  }

  const email = readCookieValue(cookieSource, USER_COOKIE);
  const account = email ? findDemoAccount(email) : undefined;

  return {
    email,
    name: readCookieValue(cookieSource, NAME_COOKIE) || account?.name || "GatherUp 用户",
    gatherUpId: readCookieValue(cookieSource, ID_COOKIE) || account?.gatherUpId || "GU-USER",
    sessionType: "demo"
  };
}

export function signInWithDemoPassword(email: string, password: string): PasswordSignInResult {
  const matchedAccount = findDemoAccount(email);

  if (!matchedAccount || password !== matchedAccount.password) {
    return {
      ok: false,
      message: "账号或密码不正确。你可以先使用下方演示账号。"
    };
  }

  return {
    ok: true,
    account: matchedAccount
  };
}

export function createSessionCookies(account: AuthUser) {
  const maxAge = 60 * 60 * 24 * 7;
  const cookieOptions = `path=/; max-age=${maxAge}; SameSite=Lax`;

  return [
    `${SESSION_COOKIE}=demo-session; ${cookieOptions}`,
    `${USER_COOKIE}=${encodeURIComponent(account.email)}; ${cookieOptions}`,
    `${NAME_COOKIE}=${encodeURIComponent(account.name)}; ${cookieOptions}`,
    `${ID_COOKIE}=${encodeURIComponent(account.gatherUpId)}; ${cookieOptions}`
  ];
}

export function createExpiredSessionCookies() {
  const cookieOptions = "path=/; max-age=0; SameSite=Lax";

  return [SESSION_COOKIE, USER_COOKIE, NAME_COOKIE, ID_COOKIE, "gatherup_role"].map(
    (cookieName) => `${cookieName}=; ${cookieOptions}`
  );
}
