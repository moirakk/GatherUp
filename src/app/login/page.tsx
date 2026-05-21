"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import {
  authProviderOptions,
  authStrategyNotes,
  createSessionCookies,
  demoAccounts,
  getAuthSession,
  signInWithDemoPassword
} from "@/lib/auth";

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
  const nextPath = searchParams.get("next") ?? "/";
  const [email, setEmail] = useState(demoAccounts[0].email);
  const [password, setPassword] = useState(demoAccounts[0].password);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (getAuthSession(document.cookie)) {
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    }
  }, [nextPath, router]);

  function login() {
    const result = signInWithDemoPassword(email, password);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    createSessionCookies(result.account).forEach((cookie) => {
      document.cookie = cookie;
    });
    router.replace(nextPath.startsWith("/") ? nextPath : "/");
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">G</span>
          <div>
            <strong>GatherUp</strong>
            <span>先登录，再进入活动组织流程。</span>
          </div>
        </div>

        <div>
          <p className="eyebrow">账号登录</p>
          <h1>一个账号，完成参与和组织</h1>
          <p className="subtle">邮箱是 GatherUp 的全球账号底座。后续可以绑定 Google、Apple、手机号和微信。</p>
        </div>

        <div className="form-grid">
          <label>
            邮箱
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            密码
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
        </div>

        {message && <p className="validation-note">{message}</p>}

        <button className="button primary full" type="button" onClick={login}>
          <LockKeyhole size={17} />
          登录
        </button>

        <div className="demo-account-grid">
          <div className="choice-card selected">
            <Mail size={18} />
            <strong>演示账号</strong>
            <span>{demoAccounts[0].email}</span>
            <span>{demoAccounts[0].gatherUpId}</span>
            <span>{demoAccounts[0].description}</span>
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
