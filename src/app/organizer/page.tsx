import Link from "next/link";
import {
  Armchair,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  MapPin,
  Plus,
  QrCode,
  ReceiptText,
  ServerCog,
  ShieldCheck,
  UsersRound,
  WalletCards
} from "lucide-react";

import { LocalCreatedEventList } from "@/components/local-created-event-list";
import { getNextActions } from "@/components/next-action-card";
import { OrganizerVerificationPanel } from "@/components/organizer-verification-panel";
import { buildOrganizerDashboardMetrics } from "@/domain/organizer-dashboard-metrics";
import type { EventSetup, GatherEvent, Registration } from "@/lib/mock-data";
import { getOrganizerDashboard } from "@/lib/organizer-data";
import styles from "./organizer.module.css";

function getPrimaryAction(event: GatherEvent, setup: EventSetup, eventRegistrations: Registration[]) {
  return getNextActions({
    basePath: `/organizer/events/${event.id}`,
    event,
    registrations: eventRegistrations,
    setup
  })[0];
}

function formatEventTime(value: string) {
  const match = value.match(/\d{4}-(\d{2})-(\d{2})\s+(.+)/);

  if (!match) {
    return value;
  }

  return `${Number(match[1])}月${Number(match[2])}日 ${match[3]}`;
}

function getStatusTone(status: string) {
  if (status.includes("报名") || status.includes("成团")) {
    return styles.statusPositive;
  }

  if (status.includes("付款") || status.includes("截止")) {
    return styles.statusAttention;
  }

  if (status.includes("结束")) {
    return styles.statusNeutral;
  }

  return styles.statusInfo;
}

export default async function OrganizerPage() {
  const { eventSetups, events, organizersByEventId, registrations } = await getOrganizerDashboard();
  const metrics = buildOrganizerDashboardMetrics(events, eventSetups, registrations);
  const activeSetups = eventSetups.filter((setup) => setup.setupStatus !== "报名已开放");
  const pendingPaymentRegistrations = registrations.filter((registration) => registration.paymentStatus === "待审核");
  const firstSetupEventId = activeSetups[0]?.eventId ?? events[0]?.id ?? "";
  const firstPaymentEventId = eventSetups.find((setup) => setup.paymentQrStatus === "已配置")?.eventId ?? events[0]?.id ?? "";
  const firstPendingPaymentEventId = pendingPaymentRegistrations[0]?.eventId ?? firstSetupEventId;
  const setupHref = firstSetupEventId ? `/organizer/events/${firstSetupEventId}` : "/organizer/events/new";
  const paymentHref = firstPaymentEventId ? `/organizer/events/${firstPaymentEventId}/finance` : "/organizer/events/new";
  const pendingPaymentHref = firstPendingPaymentEventId ? `/organizer/events/${firstPendingPaymentEventId}?panel=orders` : "/organizer/events/new";

  const tasks = [
    {
      count: metrics.pendingPaymentCount,
      detail: metrics.pendingPaymentCount > 0 ? "参与者正在等待主办确认" : "当前没有待审核付款",
      href: pendingPaymentHref,
      icon: ClipboardCheck,
      label: "审核付款",
      tone: styles.taskAttention
    },
    {
      count: metrics.activeSetupCount,
      detail: metrics.activeSetupCount > 0 ? "继续确认时间、地点和报名配置" : "所有活动均已完成筹备",
      href: setupHref,
      icon: CalendarClock,
      label: "推进筹备",
      tone: styles.taskInfo
    },
    {
      count: metrics.refundExposureCount,
      detail: metrics.refundExposureCount > 0 ? "检查退款或争议订单" : "当前没有退款风险单",
      href: paymentHref,
      icon: ReceiptText,
      label: "处理退款",
      tone: styles.taskRisk
    }
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>主办方工作区</p>
          <h1>工作台</h1>
          <p>先处理会阻塞参与者的事项，再推进活动。</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.iconButton} href="/dev/status" aria-label="查看系统状态" title="系统状态">
            <ServerCog size={19} />
          </Link>
          <Link className={styles.createButton} href="/organizer/events/new">
            <Plus size={18} />
            创建活动
          </Link>
        </div>
      </header>

      <div className={styles.dashboardGrid}>
        <section className={styles.activityColumn}>
          <div className={styles.sectionHeader}>
            <div>
              <p>活动</p>
              <h2>我的活动</h2>
            </div>
            <span>{events.length} 场</span>
          </div>

          <section className={styles.eventGroup} aria-label="我管理的活动">
            {events.length === 0 ? (
              <div className={styles.emptyState}>
                <CalendarClock size={24} />
                <strong>还没有活动</strong>
                <span>创建第一场活动，开始配置报名流程。</span>
                <Link href="/organizer/events/new">创建活动</Link>
              </div>
            ) : null}

            {events.map((event) => {
              const setup = eventSetups.find((item) => item.eventId === event.id);
              const eventRegistrations = registrations.filter((registration) => registration.eventId === event.id);
              const pendingPaymentCount = eventRegistrations.filter((registration) => registration.paymentStatus === "待审核").length;
              const organizers = organizersByEventId.get(event.id) ?? [];
              const primaryAction = setup
                ? getPrimaryAction(event, setup, eventRegistrations)
                : {
                    description: "查看活动配置与运营数据。",
                    href: `/organizer/events/${event.id}`,
                    label: "打开活动",
                    urgent: false
                  };
              const displayStatus = setup?.setupStatus ?? event.status;
              const occupancy = event.capacity > 0 ? Math.min(Math.round((event.registered / event.capacity) * 100), 100) : 0;

              return (
                <article className={styles.eventRow} key={event.id}>
                  <div className={styles.eventMain}>
                    <div className={styles.eventTitleLine}>
                      <Link href={`/organizer/events/${event.id}`}>
                        <h3>{event.name}</h3>
                      </Link>
                      <span className={`${styles.status} ${getStatusTone(displayStatus)}`}>{displayStatus}</span>
                    </div>
                    <p className={styles.eventMeta}>
                      <CalendarClock size={14} />
                      {formatEventTime(event.startsAt)}
                      <span>·</span>
                      <MapPin size={14} />
                      {event.city}
                    </p>
                    <div className={styles.eventProgress}>
                      <span style={{ width: `${occupancy}%` }} />
                    </div>
                    <div className={styles.eventFooter}>
                      <span>{event.registered}/{event.capacity} 人报名</span>
                      <span>{organizers.length} 位协作者</span>
                      {pendingPaymentCount > 0 ? <strong>{pendingPaymentCount} 笔待审核</strong> : null}
                    </div>
                  </div>

                  <div className={styles.eventControls}>
                    <Link className={styles.nextAction} href={primaryAction.href}>
                      {primaryAction.label}
                    </Link>
                    <Link
                      className={styles.rowIconButton}
                      href={`/organizer/events/${event.id}/finance`}
                      aria-label={`查看${event.name}的财务`}
                      title="财务"
                    >
                      <WalletCards size={17} />
                    </Link>
                    <Link className={styles.disclosureButton} href={`/organizer/events/${event.id}`} aria-label={`管理${event.name}`}>
                      <ChevronRight size={19} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        </section>

        <aside className={styles.sidebar}>
          <section>
            <div className={styles.sectionHeader}>
              <div>
                <p>今天</p>
                <h2>待处理</h2>
              </div>
              <span>{tasks.reduce((sum, task) => sum + task.count, 0)} 项</span>
            </div>
            <div className={styles.taskGroup}>
              {tasks.map((task) => {
                const TaskIcon = task.icon;

                return (
                  <Link className={styles.taskRow} href={task.href} key={task.label}>
                    <span className={`${styles.taskIcon} ${task.tone}`}><TaskIcon size={18} /></span>
                    <span className={styles.taskCopy}>
                      <strong>{task.label}</strong>
                      <small>{task.detail}</small>
                    </span>
                    <span className={styles.taskCount}>{task.count}</span>
                    <ChevronRight size={17} />
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <div className={styles.sectionHeader}>
              <div>
                <p>概览</p>
                <h2>运营数据</h2>
              </div>
            </div>
            <div className={styles.summaryGroup}>
              <div>
                <span><CircleDollarSign size={16} />已确认收入</span>
                <strong>¥{metrics.confirmedRevenue}</strong>
              </div>
              <div>
                <span><UsersRound size={16} />签到率</span>
                <strong>{metrics.checkInRatePercent}%</strong>
              </div>
              <Link href={paymentHref}>
                <span><QrCode size={16} />收款已配置</span>
                <strong>{metrics.paymentReadyCount}/{metrics.totalSetups}</strong>
              </Link>
              <div>
                <span><Armchair size={16} />选座进度</span>
                <strong>{metrics.seatingProgressPercent}%</strong>
              </div>
            </div>
          </section>

          <section className={styles.systemStatus}>
            <CheckCircle2 size={17} />
            <span><strong>流程运行正常</strong><small>付款、选座、签到与退款均已接入权限控制</small></span>
          </section>
        </aside>
      </div>

      <div className={styles.secondaryArea}>
        <LocalCreatedEventList />

        <details className={styles.verificationDisclosure}>
          <summary>
            <span className={styles.verificationIcon}><ShieldCheck size={18} /></span>
            <span><strong>收费活动发布资格</strong><small>主办认证与审核状态</small></span>
            <ChevronRight size={18} />
          </summary>
          <div className={styles.verificationBody}>
            <OrganizerVerificationPanel />
          </div>
        </details>
      </div>
    </div>
  );
}
