export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  gatherUpId: string;
  description: string;
};

export type DemoSession = {
  email: string;
  name: string;
  gatherUpId: string;
};

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
  return demoAccounts.find((account) => account.email === email);
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

export function readDemoSession(cookieSource: string): DemoSession | null {
  const hasSession = Boolean(readCookieValue(cookieSource, SESSION_COOKIE));

  if (!hasSession) {
    return null;
  }

  const email = readCookieValue(cookieSource, USER_COOKIE);
  const account = email ? findDemoAccount(email) : undefined;

  return {
    email,
    name: readCookieValue(cookieSource, NAME_COOKIE) || account?.name || "GatherUp 用户",
    gatherUpId: readCookieValue(cookieSource, ID_COOKIE) || account?.gatherUpId || "GU-USER"
  };
}

export function buildSessionCookies(account: DemoAccount) {
  const maxAge = 60 * 60 * 24 * 7;
  const cookieOptions = `path=/; max-age=${maxAge}; SameSite=Lax`;

  return [
    `${SESSION_COOKIE}=demo-session; ${cookieOptions}`,
    `${USER_COOKIE}=${encodeURIComponent(account.email)}; ${cookieOptions}`,
    `${NAME_COOKIE}=${encodeURIComponent(account.name)}; ${cookieOptions}`,
    `${ID_COOKIE}=${encodeURIComponent(account.gatherUpId)}; ${cookieOptions}`
  ];
}

export function buildExpiredSessionCookies() {
  const cookieOptions = "path=/; max-age=0; SameSite=Lax";

  return [SESSION_COOKIE, USER_COOKIE, NAME_COOKIE, ID_COOKIE, "gatherup_role"].map(
    (cookieName) => `${cookieName}=; ${cookieOptions}`
  );
}
