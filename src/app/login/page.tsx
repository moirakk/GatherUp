"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Globe2, KeyRound, LockKeyhole, Mail, ShieldCheck, UserPlus } from "lucide-react";

import {
  PROTOTYPE_ACCOUNTS_STORAGE_KEY,
  authProviderOptions,
  authStrategyNotes,
  createPrototypeAccount,
  createSessionCookies,
  demoAccounts,
  getProfileOnboardingStorageKey,
  getAuthSession,
  getSafeInternalPath,
  normalizeEmail,
  parsePrototypeAccounts,
  signInWithPassword,
  stringifyPrototypeAccounts
} from "@/lib/auth";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  sendSupabaseEmailCode,
  sendSupabasePasswordReset,
  signInWithSupabasePassword,
  signUpWithSupabasePassword,
  verifySupabaseEmailCode
} from "@/lib/supabase/auth";
import { getCurrentSupabaseProfile } from "@/lib/supabase/profile";

type AuthMode = "login" | "register" | "code" | "reset";

const authModeCopy: Record<AuthMode, { eyebrow: string; title: string; description: string }> = {
  login: {
    eyebrow: "账号登录",
    title: "一个账号，完成参与和组织",
    description: "邮箱是 GatherUp 的全球账号底座。后续可以绑定 Google、Apple、手机号和微信。"
  },
  register: {
    eyebrow: "创建账号",
    title: "先拥有稳定身份，再进入活动流程",
    description: "注册后会生成 GatherUp ID。正式版会通过邮箱验证码确认账号归属。"
  },
  code: {
    eyebrow: "验证码登录",
    title: "适合移动端和临时设备的登录方式",
    description: "正式版会发送 6 位验证码。当前原型会模拟发送状态，方便先确认交互。"
  },
  reset: {
    eyebrow: "找回账号",
    title: "长期有效的账号需要可靠找回机制",
    description: "正式版会通过邮箱验证后重设密码，并保留历史活动、订单和组织权限。"
  }
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>GatherUp</strong>
            <span>正在准备登录入口。</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeInternalPath(searchParams.get("next"));
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseEnabled = isSupabaseConfigured();

  useEffect(() => {
    async function redirectExistingSession() {
      const existingSession = getAuthSession(document.cookie);

      if (existingSession) {
        router.replace(nextPath);
        return;
      }

      if (!supabaseEnabled) {
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const userResult = await supabase.auth.getUser();

      if (userResult.error || !userResult.data.user) {
        return;
      }

      const profileResult = await getCurrentSupabaseProfile();

      if (!profileResult.ok) {
        return;
      }

      createSessionCookies(profileResult.account, "supabase").forEach((cookie) => {
        document.cookie = cookie;
      });
      router.replace(nextPath);
    }

    redirectExistingSession();
  }, [nextPath, router, supabaseEnabled]);

  const currentCopy = authModeCopy[mode];

  function completeLogin(
    account: { email: string; name: string; gatherUpId: string },
    destination = nextPath,
    sessionType: "demo" | "supabase" = "demo"
  ) {
    createSessionCookies(account, sessionType).forEach((cookie) => {
      document.cookie = cookie;
    });
    router.replace(getSafeInternalPath(destination));
  }

  async function login() {
    if (supabaseEnabled) {
      const result = await signInWithSupabasePassword(email, password);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      completeLogin(result.account, nextPath, "supabase");
      return;
    }

    const prototypeAccounts = parsePrototypeAccounts(window.localStorage.getItem(PROTOTYPE_ACCOUNTS_STORAGE_KEY));
    const result = signInWithPassword(email, password, prototypeAccounts);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    if (result.account.email === demoAccounts[0].email) {
      window.localStorage.setItem(getProfileOnboardingStorageKey(result.account.email), "done");
    }
    completeLogin(result.account);
  }

  async function register() {
    if (supabaseEnabled) {
      const result = await signUpWithSupabasePassword({ email, password, name });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      if (result.needsEmailConfirmation) {
        setMessage(result.message ?? "账号已创建，请先完成邮箱验证。");
        return;
      }

      completeLogin(result.account, "/onboarding", "supabase");
      return;
    }

    const prototypeAccounts = parsePrototypeAccounts(window.localStorage.getItem(PROTOTYPE_ACCOUNTS_STORAGE_KEY));
    const result = createPrototypeAccount({ email, password, name }, prototypeAccounts);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    window.localStorage.setItem(
      PROTOTYPE_ACCOUNTS_STORAGE_KEY,
      stringifyPrototypeAccounts([...prototypeAccounts, result.account])
    );
    completeLogin(result.account, "/onboarding");
  }

  async function sendCode() {
    if (!email.trim()) {
      setMessage("请输入邮箱，正式版会向这里发送验证码。");
      return;
    }

    if (supabaseEnabled) {
      const result = await sendSupabaseEmailCode(email);
      setMessage(result.message);
      return;
    }

    setVerificationCode("123456");
    setMessage("原型验证码已生成：123456。正式版会通过邮箱服务发送。");
  }

  async function loginWithCode() {
    if (supabaseEnabled) {
      const result = await verifySupabaseEmailCode(email, verificationCode);

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      completeLogin(result.account, nextPath, "supabase");
      return;
    }

    if (verificationCode !== "123456") {
      setMessage("请输入原型验证码 123456。正式版会校验邮件里的验证码。");
      return;
    }

    const prototypeAccounts = parsePrototypeAccounts(window.localStorage.getItem(PROTOTYPE_ACCOUNTS_STORAGE_KEY));
    const normalizedEmail = normalizeEmail(email);
    const matchedAccount =
      prototypeAccounts.find((account) => normalizeEmail(account.email) === normalizedEmail) ||
      demoAccounts.find((account) => normalizeEmail(account.email) === normalizedEmail);

    if (!matchedAccount) {
      setMessage("当前原型需要先注册账号，正式版可以选择验证码注册或登录。");
      return;
    }

    completeLogin(matchedAccount);
  }

  async function resetPassword() {
    if (!email.trim()) {
      setMessage("请输入需要找回的邮箱。");
      return;
    }

    if (supabaseEnabled) {
      const result = await sendSupabasePasswordReset(email);
      setMessage(result.message);
      return;
    }

    setMessage("已模拟发送找回邮件。正式版会通过验证链接或验证码重设密码。");
  }

  async function submitPrimaryAction() {
    setMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await register();
        return;
      }

      if (mode === "code") {
        await loginWithCode();
        return;
      }

      if (mode === "reset") {
        await resetPassword();
        return;
      }

      await login();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>GatherUp</strong>
            <span>{supabaseEnabled ? "已连接真实账号服务。" : "当前使用本地原型账号。"}</span>
          </div>
        </div>

        <div>
          <p className="eyebrow">{currentCopy.eyebrow}</p>
          <h1>{currentCopy.title}</h1>
          <p className="subtle">{currentCopy.description}</p>
        </div>

        <div className="auth-tabs" aria-label="账号操作">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            登录
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
            注册
          </button>
          <button className={mode === "code" ? "active" : ""} type="button" onClick={() => setMode("code")}>
            验证码
          </button>
          <button className={mode === "reset" ? "active" : ""} type="button" onClick={() => setMode("reset")}>
            找回
          </button>
        </div>

        <div className="form-grid">
          {mode === "register" && (
            <label>
              昵称
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：比奇堡miki" />
            </label>
          )}
          <label>
            邮箱
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {(mode === "login" || mode === "register") && (
            <label>
              密码
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          )}
          {mode === "code" && (
            <label>
              验证码
              <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} placeholder="原型验证码 123456" />
            </label>
          )}
        </div>

        {message && <p className="validation-note">{message}</p>}

        <div className="auth-action-grid">
          {mode === "code" && (
            <button className="button secondary full" type="button" onClick={sendCode} disabled={isSubmitting}>
              <Mail size={17} />
              发送验证码
            </button>
          )}
          <button className="button primary full" type="button" onClick={submitPrimaryAction} disabled={isSubmitting}>
            {mode === "register" && <UserPlus size={17} />}
            {mode === "reset" && <KeyRound size={17} />}
            {(mode === "login" || mode === "code") && <LockKeyhole size={17} />}
            {isSubmitting ? "处理中" : mode === "register" ? "创建账号" : mode === "reset" ? "发送找回邮件" : "登录"}
          </button>
        </div>

        <div className="demo-account-grid">
          <div className="choice-card selected">
            <Mail size={18} />
            <strong>演示账号</strong>
            <span>{demoAccounts[0].email}</span>
            <span>{demoAccounts[0].gatherUpId}</span>
            <span>{demoAccounts[0].description}</span>
          </div>
          <div className="choice-card">
            <BadgeCheck size={18} />
            <strong>{supabaseEnabled ? "真实账号服务" : "正式版账号保存方式"}</strong>
            <span>
              {supabaseEnabled
                ? "当前登录页会使用 Supabase Auth。下一步会把用户资料同步到 users 表。"
                : "账号资料会进入数据库，验证码记录会有过期时间，所有活动数据绑定永久 user_id。"}
            </span>
          </div>
        </div>

        <div className="provider-grid">
          {authProviderOptions.map((option) => {
            const ProviderIcon = option.provider === "email" ? Mail : option.provider === "wechat" ? ShieldCheck : Globe2;

            return (
              <div className={`provider-card ${option.availability === "ready" ? "active" : ""}`} key={option.label}>
                <ProviderIcon size={17} />
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="login-aside">
        <ShieldCheck size={28} />
        <h2>为什么用统一账号？</h2>
        <div className="notice-list">
          {authStrategyNotes.map((note) => (
            <div key={note}>{note}</div>
          ))}
        </div>
      </aside>
    </main>
  );
}
