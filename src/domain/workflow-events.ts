import {
  assertTransition,
  type CheckInStatus,
  type PaymentStatus,
  type RefundStatus,
  type RegistrationStatus,
  type WaitlistStatus,
  type WorkflowName
} from "./status-machine.ts";

export type WorkflowAudience = "participant" | "organizer" | "finance" | "staff" | "admin" | "none";
export type WorkflowRiskLevel = "low" | "medium" | "high";

type WorkflowStatus<TWorkflow extends WorkflowName> =
  TWorkflow extends "registration" ? RegistrationStatus :
  TWorkflow extends "payment" ? PaymentStatus :
  TWorkflow extends "refund" ? RefundStatus :
  TWorkflow extends "waitlist" ? WaitlistStatus :
  CheckInStatus;

export type WorkflowTransitionEvent<TWorkflow extends WorkflowName = WorkflowName> = {
  workflow: TWorkflow;
  from: WorkflowStatus<TWorkflow>;
  to: WorkflowStatus<TWorkflow>;
  auditAction: string;
  notificationType: string | null;
  audience: WorkflowAudience;
  riskLevel: WorkflowRiskLevel;
};

type TransitionEventRule<TStatus extends string> = {
  auditAction: string;
  notificationType: string | null;
  audience: WorkflowAudience;
  riskLevel: WorkflowRiskLevel;
  from?: TStatus;
  to: TStatus;
};

const registrationEventRules: ReadonlyArray<TransitionEventRule<RegistrationStatus>> = [
  { to: "payment_submitted", auditAction: "registration.payment_submitted", notificationType: "payment_proof_submitted", audience: "organizer", riskLevel: "medium" },
  { to: "payment_rejected_resubmittable", auditAction: "registration.payment_rejected", notificationType: "payment_rejected", audience: "participant", riskLevel: "medium" },
  { to: "partial_paid_needs_topup", auditAction: "registration.payment_topup_required", notificationType: "payment_topup_required", audience: "participant", riskLevel: "medium" },
  { to: "confirmed", auditAction: "registration.confirmed", notificationType: "registration_confirmed", audience: "participant", riskLevel: "medium" },
  { to: "waitlisted", auditAction: "registration.waitlisted", notificationType: "registration_waitlisted", audience: "participant", riskLevel: "low" },
  { to: "refunding", auditAction: "registration.refunding", notificationType: "refund_started", audience: "participant", riskLevel: "medium" },
  { to: "refunded", auditAction: "registration.refunded", notificationType: "refund_completed", audience: "participant", riskLevel: "medium" },
  { to: "cancelled", auditAction: "registration.cancelled", notificationType: "registration_cancelled", audience: "participant", riskLevel: "medium" },
  { to: "expired", auditAction: "registration.expired", notificationType: "registration_expired", audience: "participant", riskLevel: "low" }
];

const paymentEventRules: ReadonlyArray<TransitionEventRule<PaymentStatus>> = [
  { to: "submitted", auditAction: "payment.submitted", notificationType: "payment_proof_submitted", audience: "organizer", riskLevel: "medium" },
  { to: "confirmed", auditAction: "payment.confirmed", notificationType: "payment_confirmed", audience: "participant", riskLevel: "medium" },
  { to: "rejected", auditAction: "payment.rejected", notificationType: "payment_rejected", audience: "participant", riskLevel: "medium" },
  { to: "topup_required", auditAction: "payment.topup_required", notificationType: "payment_topup_required", audience: "participant", riskLevel: "medium" },
  { to: "refunding", auditAction: "payment.refunding", notificationType: "refund_started", audience: "participant", riskLevel: "medium" },
  { to: "refunded", auditAction: "payment.refunded", notificationType: "refund_completed", audience: "participant", riskLevel: "medium" },
  { to: "disputed", auditAction: "payment.disputed", notificationType: "payment_disputed", audience: "finance", riskLevel: "high" }
];

const refundEventRules: ReadonlyArray<TransitionEventRule<RefundStatus>> = [
  { to: "approved", auditAction: "refund.approved", notificationType: "refund_approved", audience: "participant", riskLevel: "medium" },
  { to: "rejected", auditAction: "refund.rejected", notificationType: "refund_rejected", audience: "participant", riskLevel: "medium" },
  { to: "paid_offline", auditAction: "refund.paid_offline", notificationType: "refund_paid_offline", audience: "participant", riskLevel: "medium" },
  { to: "proof_uploaded", auditAction: "refund.proof_uploaded", notificationType: "refund_proof_uploaded", audience: "participant", riskLevel: "medium" },
  { to: "confirmed", auditAction: "refund.confirmed", notificationType: "refund_confirmed", audience: "organizer", riskLevel: "medium" },
  { to: "disputed", auditAction: "refund.disputed", notificationType: "refund_disputed", audience: "finance", riskLevel: "high" },
  { to: "cancelled", auditAction: "refund.cancelled", notificationType: "refund_cancelled", audience: "participant", riskLevel: "medium" }
];

const waitlistEventRules: ReadonlyArray<TransitionEventRule<WaitlistStatus>> = [
  { to: "waiting", auditAction: "waitlist.joined", notificationType: "registration_waitlisted", audience: "participant", riskLevel: "low" },
  { to: "invited", auditAction: "waitlist.invited", notificationType: "waitlist_invited", audience: "participant", riskLevel: "medium" },
  { to: "converted", auditAction: "waitlist.converted", notificationType: "waitlist_converted", audience: "participant", riskLevel: "medium" },
  { to: "expired", auditAction: "waitlist.expired", notificationType: "waitlist_invitation_expired", audience: "participant", riskLevel: "low" },
  { to: "cancelled", auditAction: "waitlist.cancelled", notificationType: "waitlist_cancelled", audience: "participant", riskLevel: "low" },
  { to: "skipped", auditAction: "waitlist.skipped", notificationType: null, audience: "none", riskLevel: "medium" }
];

const checkInEventRules: ReadonlyArray<TransitionEventRule<CheckInStatus>> = [
  { to: "arrived", auditAction: "check_in.arrived", notificationType: null, audience: "none", riskLevel: "low" },
  { to: "exception", auditAction: "check_in.exception", notificationType: "check_in_exception", audience: "staff", riskLevel: "medium" }
];

const eventRules = {
  registration: registrationEventRules,
  payment: paymentEventRules,
  refund: refundEventRules,
  waitlist: waitlistEventRules,
  checkIn: checkInEventRules
} as const;

function defaultAuditAction(workflow: WorkflowName, to: string) {
  return `${workflow}.${to}`;
}

function findRule<TWorkflow extends WorkflowName>(
  workflow: TWorkflow,
  from: WorkflowStatus<TWorkflow>,
  to: WorkflowStatus<TWorkflow>
) {
  const rules = eventRules[workflow] as ReadonlyArray<TransitionEventRule<string>>;
  return rules.find((rule) => rule.to === to && (!rule.from || rule.from === from));
}

export function createWorkflowTransitionEvent<TWorkflow extends WorkflowName>(
  workflow: TWorkflow,
  from: WorkflowStatus<TWorkflow>,
  to: WorkflowStatus<TWorkflow>
): WorkflowTransitionEvent<TWorkflow> {
  assertTransition(workflow, from, to);

  const rule = findRule(workflow, from, to);

  return {
    workflow,
    from,
    to,
    auditAction: rule?.auditAction ?? defaultAuditAction(workflow, to),
    notificationType: rule?.notificationType ?? null,
    audience: rule?.audience ?? "none",
    riskLevel: rule?.riskLevel ?? "low"
  };
}

export function shouldCreateNotification(event: WorkflowTransitionEvent) {
  return Boolean(event.notificationType && event.audience !== "none");
}

export function shouldWriteAuditLog(event: WorkflowTransitionEvent) {
  return Boolean(event.auditAction);
}
