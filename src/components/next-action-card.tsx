import Link from "next/link";
import { ArrowRight, BellRing, CalendarCheck, CircleDollarSign, MapPinned, Megaphone } from "lucide-react";

import type { EventSetup, GatherEvent, Registration } from "@/lib/mock-data";

export type NextAction = {
  label: string;
  description: string;
  href: string;
  urgent?: boolean;
};

type NextActionCardProps = {
  basePath: string;
  event: GatherEvent;
  registrations: Registration[];
  setup: EventSetup;
};

function hasFinalTime(setup: EventSetup) {
  return setup.surveyOptions.some((option) => option.selected);
}

function hasFinalVenue(setup: EventSetup) {
  return setup.venueOptions.some((option) => option.selected);
}

function hasSeatAssignment(registration: Registration) {
  return !registration.seatStatus.includes("未") && registration.seatStatus.trim().length > 0;
}

export function getNextActions({
  basePath,
  event,
  registrations,
  setup
}: NextActionCardProps): NextAction[] {
  const pendingPaymentCount = registrations.filter((registration) => registration.paymentStatus === "待审核").length;
  const confirmedUnseatedCount = registrations
    .filter((registration) => registration.paymentStatus === "付款已确认")
    .filter((registration) => !hasSeatAssignment(registration))
    .reduce((sum, registration) => sum + registration.quantity, 0);

  const actions: NextAction[] = [];

  if (pendingPaymentCount > 0) {
    actions.push({
      label: `审核 ${pendingPaymentCount} 笔待确认付款`,
      description: "先处理付款截图，避免参与者长时间停在待确认状态。",
      href: `${basePath}?panel=orders`,
      urgent: true
    });
  }

  if (!hasFinalTime(setup)) {
    actions.push({
      label: "确认最终活动时间",
      description: "时间未定会阻塞报名发布和后续通知。",
      href: `${basePath}?panel=survey`
    });
  }

  if (!hasFinalVenue(setup)) {
    actions.push({
      label: "确认最终活动地点",
      description: "地点未定会影响付款说明、现场动线和对外宣传。",
      href: `${basePath}?panel=venue`
    });
  }

  if (setup.setupStatus === "待开放报名" || event.status === "待开放报名") {
    actions.push({
      label: "开放报名入口",
      description: "时间、地点和收款信息已准备好后，可以发布正式报名入口。",
      href: `${basePath}?panel=publish`
    });
  }

  if (event.template === "选座活动" && confirmedUnseatedCount > 0) {
    actions.push({
      label: `通知 ${confirmedUnseatedCount} 人选座`,
      description: "付款已确认但还未完成座位安排，适合发送选座提醒。",
      href: `${basePath}?panel=notify`
    });
  }

  if (actions.length > 0) {
    return actions;
  }

  return [
    {
      label: "查看活动总览",
      description: "当前没有高优先级待办，可以继续检查报名、通知和现场准备。",
      href: basePath
    }
  ];
}

function getActionIcon(action: NextAction) {
  if (action.href.includes("panel=orders")) return <CircleDollarSign size={18} />;
  if (action.href.includes("panel=survey")) return <CalendarCheck size={18} />;
  if (action.href.includes("panel=venue")) return <MapPinned size={18} />;
  if (action.href.includes("panel=publish")) return <Megaphone size={18} />;
  if (action.href.includes("panel=notify")) return <BellRing size={18} />;
  return <ArrowRight size={18} />;
}

export function NextActionCard(props: NextActionCardProps) {
  const actions = getNextActions(props);

  return (
    <section className="next-action-card" aria-label="下一步行动">
      <div>
        <p className="eyebrow">下一步行动</p>
        <h2>优先处理这些事项</h2>
      </div>
      <div className="next-action-list">
        {actions.map((action) => (
          <article className={`next-action-item ${action.urgent ? "urgent" : ""}`} key={`${action.label}-${action.href}`}>
            <div>
              <strong>{getActionIcon(action)}{action.label}</strong>
              <p>{action.description}</p>
            </div>
            <Link className={`button ${action.urgent ? "primary" : "secondary"}`} href={action.href}>
              立即处理
              <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
