"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, LayoutDashboard, LogOut, Plus, UserRound } from "lucide-react";

import {
  createExpiredSessionCookies,
  demoAccounts,
  getAuthSession,
  getProfileOnboardingStorageKey,
  type AuthSession
} from "@/lib/auth";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const currentSession = getAuthSession(document.cookie);
    setSession(currentSession);
    setIsCheckingAuth(false);

    if (!currentSession && pathname !== "/login") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }

    if (currentSession && pathname !== "/onboarding") {
      const isSeedDemoAccount = currentSession.email === demoAccounts[0].email;
      const hasCompletedProfile = window.localStorage.getItem(getProfileOnboardingStorageKey(currentSession.email)) === "done";

      if (!isSeedDemoAccount && !hasCompletedProfile) {
        router.replace("/onboarding");
      }
    }
  }, [pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isCheckingAuth || !session) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-brand">
            <span className="brand-mark">G</span>
            <div>
              <strong>GatherUp</strong>
              <span>正在确认登录状态。</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  function logout() {
    createExpiredSessionCookies().forEach((cookie) => {
      document.cookie = cookie;
    });
    setSession(null);
    router.replace("/login");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">G</span>
          <span>
            <strong>GatherUp</strong>
            <small>活动组织工作台</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="主导航">
          <Link href="/">活动广场</Link>
          <Link href="/me">我的活动</Link>
          <Link href="/organizer">工作台</Link>
        </nav>

        <div className="topbar-actions">
          <Link className="icon-button" href="/organizer/events/new" aria-label="创建活动">
            <Plus size={19} />
          </Link>
          <span className="account-pill" title={`${session.email} · ${session.gatherUpId}`}>
            已登录
          </span>
          <Link className="avatar-button" href="/me" aria-label="个人中心">
            {session.name.slice(0, 1)}
          </Link>
          <button className="icon-button" type="button" aria-label="退出登录" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="page-shell">{children}</main>

      <nav className="mobile-nav" aria-label="移动端导航">
        <Link href="/">
          <CalendarRange size={18} />
          广场
        </Link>
        <Link href="/me">
          <UserRound size={18} />
          我的
        </Link>
        <Link href="/organizer">
          <LayoutDashboard size={18} />
          工作台
        </Link>
      </nav>
    </div>
  );
}
