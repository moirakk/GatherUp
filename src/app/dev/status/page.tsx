"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Database, KeyRound, ServerCog, UserRound } from "lucide-react";

import { getAuthSession, type AuthSession } from "@/lib/auth";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getCurrentSupabaseProfile } from "@/lib/supabase/profile";

type CheckStatus = "ready" | "warning" | "pending";

type StatusCheck = {
  label: string;
  description: string;
  status: CheckStatus;
};

function statusText(status: CheckStatus) {
  if (status === "ready") {
    return "已就绪";
  }

  if (status === "warning") {
    return "需处理";
  }

  return "待配置";
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "ready") {
    return <CheckCircle2 size={18} />;
  }

  if (status === "warning") {
    return <CircleAlert size={18} />;
  }

  return <ServerCog size={18} />;
}

export default function DevStatusPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [supabaseUserEmail, setSupabaseUserEmail] = useState("");
  const [profileMessage, setProfileMessage] = useState("尚未检查。");
  const [profileReady, setProfileReady] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    const currentSession = getAuthSession(document.cookie);
    setSession(currentSession);

    if (!supabaseConfigured || currentSession?.sessionType !== "supabase") {
      return;
    }

    async function checkSupabaseState() {
      const supabase = getSupabaseBrowserClient();
      const userResult = await supabase.auth.getUser();

      if (userResult.error || !userResult.data.user?.email) {
        setProfileMessage("Supabase 登录状态不可用，请重新登录。");
        return;
      }

      setSupabaseUserEmail(userResult.data.user.email);
      const profileResult = await getCurrentSupabaseProfile();

      if (!profileResult.ok) {
        setProfileMessage(profileResult.message);
        return;
      }

      setProfileReady(true);
      setProfileMessage(`${profileResult.account.name} · ${profileResult.account.gatherUpId}`);
    }

    checkSupabaseState();
  }, [supabaseConfigured]);

  const checks = useMemo<StatusCheck[]>(() => {
    const isSupabaseSession = session?.sessionType === "supabase";

    return [
      {
        label: "本地应用",
        description: "Next.js 页面、路由和原型数据可以正常运行。",
        status: "ready"
      },
      {
        label: "Supabase 环境变量",
        description: supabaseConfigured ? "已读取 Project URL 和 anon key。" : "还需要配置 .env.local。",
        status: supabaseConfigured ? "ready" : "pending"
      },
      {
        label: "登录状态",
        description: session
          ? `${session.email} · ${session.sessionType === "supabase" ? "真实账号" : "本地原型"}`
          : "还没有登录。",
        status: session ? "ready" : "warning"
      },
      {
        label: "Supabase Auth",
        description: isSupabaseSession
          ? supabaseUserEmail || "正在读取 Supabase 用户。"
          : "当前不是 Supabase 登录，会继续使用本地原型流程。",
        status: isSupabaseSession ? "ready" : supabaseConfigured ? "warning" : "pending"
      },
      {
        label: "users 资料同步",
        description: profileMessage,
        status: profileReady ? "ready" : supabaseConfigured ? "warning" : "pending"
      }
    ];
  }, [profileMessage, profileReady, session, supabaseConfigured, supabaseUserEmail]);

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">开发状态</p>
          <h1>后端接入检查</h1>
          <p className="subtle">用于确认 GatherUp 从本地原型切换到 Supabase 真实账号和数据库时的关键状态。</p>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <KeyRound size={20} />
          <span>账号模式</span>
          <strong>{session?.sessionType === "supabase" ? "Supabase" : "本地原型"}</strong>
        </article>
        <article className="metric-card">
          <Database size={20} />
          <span>数据库连接</span>
          <strong>{supabaseConfigured ? "已配置" : "未配置"}</strong>
        </article>
        <article className="metric-card">
          <UserRound size={20} />
          <span>用户资料</span>
          <strong>{profileReady ? "已同步" : "待验证"}</strong>
        </article>
      </section>

      <section className="setup-grid">
        {checks.map((check) => (
          <article className={`content-card setup-card dev-status-card ${check.status}`} key={check.label}>
            <div className="section-heading">
              <div>
                <span className="tag">{statusText(check.status)}</span>
                <h2>{check.label}</h2>
              </div>
              <StatusIcon status={check.status} />
            </div>
            <p className="subtle">{check.description}</p>
          </article>
        ))}
      </section>

      <section className="content-card setup-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">下一步</p>
            <h2>从原型进入真实后端</h2>
          </div>
          <ServerCog size={22} />
        </div>
        <div className="notice-list">
          <div>在 Supabase 创建项目，复制 Project URL 和 anon public key 到 `.env.local`。</div>
          <div>在 Supabase SQL Editor 运行 `supabase/schema.sql`，确认 RLS 策略创建成功。</div>
          <div>重新启动本地开发服务器，再注册一个真实邮箱账号验证 Auth 和 users 资料同步。</div>
        </div>
      </section>
    </>
  );
}
