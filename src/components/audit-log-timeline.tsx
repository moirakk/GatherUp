import { ShieldCheck } from "lucide-react";

import type { EventAuditLog } from "@/lib/organizer-data";

type AuditLogTimelineProps = {
  logs: EventAuditLog[];
};

const riskTone: Record<string, string> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "neutral"
};

const actionLabels: Record<string, string> = {
  "event.organizer.added": "新增协作者",
  "event.organizer.updated": "更新协作者",
  "event.organizer.removed": "移除协作者",
  "payment.approved": "付款审核通过",
  "payment.rejected": "付款审核拒绝",
  "refund.requested": "发起退款",
  "refund.approved": "退款审核通过",
  "refund.rejected": "退款审核拒绝",
  "order.checked_in": "现场核销",
  "waitlist.invited": "候补转正邀请"
};

function getActionLabel(action: string) {
  return actionLabels[action] ?? action;
}

export function AuditLogTimeline({ logs }: AuditLogTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <ShieldCheck size={18} />
        <span>暂无审计记录。后续协作者、付款、退款、核销等关键操作会显示在这里。</span>
      </div>
    );
  }

  return (
    <div className="audit-log-timeline">
      {logs.map((log) => (
        <div className="audit-log-entry" key={log.id}>
          <div className="audit-log-entry-header">
            <strong>{getActionLabel(log.action)}</strong>
            <span className={`status-badge ${riskTone[log.riskLevel] ?? "neutral"}`}>{log.riskLevel}</span>
          </div>
          <p className="subtle">{log.createdAt} · {log.actorRole} · {log.targetType}</p>
          <dl className="audit-log-snapshot">
            <div><dt>之前</dt><dd>{log.beforeSummary}</dd></div>
            <div><dt>之后</dt><dd>{log.afterSummary}</dd></div>
          </dl>
          {log.reason !== "未填写原因" && <p className="subtle">原因：{log.reason}</p>}
        </div>
      ))}
    </div>
  );
}
