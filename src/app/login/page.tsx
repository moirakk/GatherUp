"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import {
  buildSessionCookies,
  demoAccounts,
  findDemoAccount,
  readDemoSession,
  type DemoAccount
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

  const selectedAccount = useMemo(() => {
    return demoAccounts.find((account) => account.email === email) ?? demoAccounts[0];
  }, [email]);

  useEffect(() => {
    if (readDemoSession(document.cookie)) {
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    }
  }, [nextPath, router]);

  function useDemoAccount(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setMessage("");
  }

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
          <h1>保护活动信息和订单状态</h1>
          <p className="subtle">活动广场、参与流程、订单、组织者工作台都需要登录后查看。</p>
        </div>

        <div className="form-grid">
          <label>
            邮箱 / 手机号 / 微信绑定账号
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
          {demoAccounts.map((account) => (
            <button
              className={`choice-card ${selectedAccount.email === account.email ? "selected" : ""}`}
              key={account.email}
              type="button"
              onClick={() => useDemoAccount(account)}
            >
              <Mail size={18} />
              <strong>{account.label}</strong>
              <span>{account.email}</span>
              <span>{account.gatherUpId} · {account.role === "organizer" ? "组织者" : "参与者"}</span>
              <span>{account.description}</span>
            </button>
          ))}
        </div>
      </section>

      <aside className="login-aside">
        <ShieldCheck size={28} />
        <h2>为什么必须登录？</h2>
        <div className="notice-list">
          <div>数调和地点投票需要绑定用户，避免重复提交。</div>
          <div>报名、付款截图、同行人 ID 和订单状态都属于个人信息。</div>
          <div>组织者后台只能由活动创建者或管理员进入。</div>
        </div>
      </aside>
    </main>
  );
}
