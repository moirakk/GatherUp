import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarRange, LayoutDashboard, Plus, UserRound } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
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
          <Link href="/organizer">组织工作台</Link>
        </nav>

        <div className="topbar-actions">
          <Link className="icon-button" href="/organizer/events/new" aria-label="创建活动">
            <Plus size={19} />
          </Link>
          <Link className="avatar-button" href="/me" aria-label="个人中心">
            比
          </Link>
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
          组织
        </Link>
      </nav>
    </div>
  );
}
