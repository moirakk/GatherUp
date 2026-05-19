export type DemoRole = "participant" | "organizer";

export type DemoAccount = {
  label: string;
  email: string;
  password: string;
  role: DemoRole;
  name: string;
  gatherUpId: string;
  description: string;
};

export type DemoSession = {
  email: string;
  role: DemoRole;
  name: string;
  gatherUpId: string;
};

export const SESSION_COOKIE = "gatherup_session";
export const USER_COOKIE = "gatherup_user";
export const ROLE_COOKIE = "gatherup_role";
export const NAME_COOKIE = "gatherup_name";
export const ID_COOKIE = "gatherup_id";

export const demoAccounts: DemoAccount[] = [
  {
    label: "参与者账号",
    email: "miki@gatherup.local",
    password: "gatherup123",
    role: "participant",
    name: "比奇堡miki",
    gatherUpId: "GU-MIKI",
    description: "可查看活动、参与数调、投票、报名和订单。"
  },
  {
    label: "组织者账号",
    email: "organizer@gatherup.local",
    password: "gatherup123",
    role: "organizer",
    name: "GatherUp 组织者",
    gatherUpId: "GU-ORG",
    description: "可进入组织工作台，配置活动和处理报名。"
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
    role: (readCookieValue(cookieSource, ROLE_COOKIE) as DemoRole) || account?.role || "participant",
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
    `${ROLE_COOKIE}=${account.role}; ${cookieOptions}`,
    `${NAME_COOKIE}=${encodeURIComponent(account.name)}; ${cookieOptions}`,
    `${ID_COOKIE}=${encodeURIComponent(account.gatherUpId)}; ${cookieOptions}`
  ];
}

export function buildExpiredSessionCookies() {
  const cookieOptions = "path=/; max-age=0; SameSite=Lax";

  return [SESSION_COOKIE, USER_COOKIE, ROLE_COOKIE, NAME_COOKIE, ID_COOKIE].map(
    (cookieName) => `${cookieName}=; ${cookieOptions}`
  );
}
