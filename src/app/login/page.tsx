"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { buildSessionCookies, demoAccounts, findDemoAccount, readDemoSession } from "@/lib/auth";

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
    if (readDemoSession(document.cookie)) {
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    }
  }, [nextPath, router]);

  function login() {
    const matchedAccount = findDemoAccount(email);

    if (!matchedAccount || password !== matchedAccount.password) {
      setMessage("账号或密码不正确。你可以先使用下方演示账号。");
      return;
    }

    buildSessionCookies(matchedAccount).forEach((cookie) => {
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
          <div className="provider-card active">
            <Mail size={17} />
            <strong>邮箱</strong>
            <span>全球账号底座</span>
          </div>
          <div className="provider-card">
            <Globe2 size={17} />
            <strong>Google / Apple</strong>
            <span>全球快捷登录</span>
          </div>
          <div className="provider-card">
            <ShieldCheck size={17} />
            <strong>微信 / 手机号</strong>
            <span>地区化增强</span>
          </div>
        </div>
      </section>

      <aside className="login-aside">
        <ShieldCheck size={28} />
        <h2>为什么用统一账号？</h2>
        <div className="notice-list">
          <div>邮箱账号可以跨国家、跨设备、跨平台找回。</div>
          <div>Google、Apple、微信等只是登录方式，都会绑定到同一个 GatherUp 用户。</div>
          <div>活动、订单、付款截图和管理权限都绑定到稳定的用户 ID。</div>
        </div>
      </aside>
    </main>
  );
}
