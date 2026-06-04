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

const commercialSchemaTables = [
  "organizer_verifications",
  "review_requests",
  "collection_code_versions",
  "refund_requests",
  "seat_locks",
  "complaints",
  "admin_users",
  "audit_logs"
];

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
  const [supabaseAuthMessage, setSupabaseAuthMessage] = useState("尚未检查。");
  const [supabaseAuthReady, setSupabaseAuthReady] = useState(false);
  const [profileMessage, setProfileMessage] = useState("尚未检查。");
  const [profileReady, setProfileReady] = useState(false);
  const [schemaMessage, setSchemaMessage] = useState("尚未检查。");
  const [schemaReady, setSchemaReady] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    let isCancelled = false;
    const currentSession = getAuthSession(document.cookie);
    setSession(currentSession);

    if (!supabaseConfigured) {
      setSupabaseAuthMessage("还没有配置 Supabase 环境变量。");
      setProfileMessage("等待 Supabase 环境变量。");
      setSchemaMessage("等待 Supabase 环境变量。");
      return;
    }

    async function checkSupabaseState() {
      const supabase = getSupabaseBrowserClient();
      const userResult = await supabase.auth.getUser();

      if (userResult.error || !userResult.data.user?.email) {
        if (isCancelled) {
          return;
        }

        setSupabaseAuthReady(false);
        setSupabaseAuthMessage("没有可用的 Supabase Auth session，请使用真实账号登录。");
        setProfileMessage("Supabase 登录状态不可用，请重新登录。");
        setSchemaMessage("需要 Supabase 登录后再检查商业化核心表。");
        return;
      }

      if (isCancelled) {
        return;
      }

      setSupabaseAuthReady(true);
      setSupabaseAuthMessage(`${userResult.data.user.email} · ${userResult.data.user.id}`);

      const profileResult = await getCurrentSupabaseProfile();

      if (!profileResult.ok) {
        if (isCancelled) {
          return;
        }

        setProfileReady(false);
        setProfileMessage(profileResult.message);
        setSchemaMessage("users 资料同步成功后再检查商业化核心表。");
        return;
      }

      if (isCancelled) {
        return;
      }

      setProfileReady(true);
      setProfileMessage(`${profileResult.account.name} · ${profileResult.account.gatherUpId}`);

      const tableChecks = await Promise.all(
        commercialSchemaTables.map(async (tableName) => {
          const tableResult = await supabase.from(tableName).select("id", { head: true, count: "exact" });

          return {
            tableName,
            errorMessage: tableResult.error?.message ?? ""
          };
        })
      );
      const failedTables = tableChecks.filter((tableCheck) => tableCheck.errorMessage);

      if (isCancelled) {
        return;
      }

      if (failedTables.length > 0) {
        setSchemaReady(false);
        setSchemaMessage(
          failedTables
            .map((tableCheck) => `${tableCheck.tableName}: ${tableCheck.errorMessage}`)
            .join("；")
        );
        return;
      }

      setSchemaReady(true);
      setSchemaMessage(`已检查 ${commercialSchemaTables.length} 张商业化核心表。`);
    }

    checkSupabaseState();

    return () => {
      isCancelled = true;
    };
  }, [supabaseConfigured]);

  const checks = useMemo<StatusCheck[]>(() => {
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
        label: "GatherUp Cookie Session",
        description: session
          ? `${session.email} · ${session.sessionType === "supabase" ? "由 Supabase 恢复" : "本地原型"}`
          : "没有 GatherUp 应用 cookie。公共活动详情仍可访问，受保护页面会跳转登录。",
        status: session ? "ready" : "warning"
      },
      {
        label: "Supabase Auth Session",
        description: supabaseAuthMessage,
        status: supabaseAuthReady ? "ready" : supabaseConfigured ? "warning" : "pending"
      },
      {
        label: "users 资料同步",
        description: profileMessage,
        status: profileReady ? "ready" : supabaseConfigured ? "warning" : "pending"
      },
      {
        label: "商业化 Schema",
        description: schemaMessage,
        status: schemaReady ? "ready" : supabaseConfigured ? "warning" : "pending"
      }
    ];
  }, [profileMessage, profileReady, schemaMessage, schemaReady, session, supabaseAuthMessage, supabaseAuthReady, supabaseConfigured]);

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
          <span>Cookie Session</span>
          <strong>{session ? "已存在" : "未建立"}</strong>
        </article>
        <article className="metric-card">
          <KeyRound size={20} />
          <span>Supabase Session</span>
          <strong>{supabaseAuthReady ? "已恢复" : "待验证"}</strong>
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
        <article className="metric-card">
          <ServerCog size={20} />
          <span>商业化表</span>
          <strong>{schemaReady ? "已就绪" : "待验证"}</strong>
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
          <div>运行 `supabase/seed.sql`，再回到本页检查商业化核心表是否就绪。</div>
          <div>重新启动本地开发服务器，再注册一个真实邮箱账号验证 Auth 和 users 资料同步。</div>
        </div>
      </section>
    </>
  );
}
