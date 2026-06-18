export const registrationStatuses = [
  "draft",
  "pending_review",
  "awaiting_payment",
  "payment_submitted",
  "payment_rejected_resubmittable",
  "partial_paid_needs_topup",
  "confirmed",
  "waitlisted",
  "cancelled",
  "expired",
  "refunding",
  "refunded"
] as const;

export const paymentStatuses = [
  "unpaid",
  "submitted",
  "partially_confirmed",
  "topup_required",
  "confirmed",
  "rejected",
  "overpaid",
  "refunding",
  "refunded",
  "disputed"
] as const;

export const refundStatuses = [
  "requested",
  "approved",
  "rejected",
  "paid_offline",
  "proof_uploaded",
  "confirmed",
  "disputed",
  "cancelled"
] as const;

export const checkInStatuses = [
  "not_arrived",
  "arrived",
  "exception"
] as const;

export type RegistrationStatus = (typeof registrationStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type RefundStatus = (typeof refundStatuses)[number];
export type CheckInStatus = (typeof checkInStatuses)[number];
export type WorkflowName = "registration" | "payment" | "refund" | "checkIn";

type TransitionMap<TStatus extends string> = Record<TStatus, readonly TStatus[]>;

export class InvalidStatusTransitionError extends Error {
  readonly workflow: WorkflowName;
  readonly from: string;
  readonly to: string;

  constructor(workflow: WorkflowName, from: string, to: string) {
    super(`Invalid ${workflow} status transition: ${from} -> ${to}`);
    this.name = "InvalidStatusTransitionError";
    this.workflow = workflow;
    this.from = from;
    this.to = to;
  }
}

export const registrationTransitions = {
  draft: ["pending_review", "awaiting_payment", "confirmed", "waitlisted", "cancelled"],
  pending_review: ["awaiting_payment", "confirmed", "waitlisted", "cancelled"],
  awaiting_payment: ["payment_submitted", "payment_rejected_resubmittable", "expired", "cancelled"],
  payment_submitted: ["confirmed", "payment_rejected_resubmittable", "partial_paid_needs_topup", "cancelled"],
  payment_rejected_resubmittable: ["awaiting_payment", "payment_submitted", "cancelled"],
  partial_paid_needs_topup: ["payment_submitted", "confirmed", "cancelled"],
  confirmed: ["refunding", "refunded", "cancelled"],
  waitlisted: ["awaiting_payment", "confirmed", "cancelled", "expired"],
  cancelled: [],
  expired: [],
  refunding: ["confirmed", "refunded"],
  refunded: []
} as const satisfies TransitionMap<RegistrationStatus>;

export const paymentTransitions = {
  unpaid: ["submitted", "rejected", "disputed"],
  submitted: ["confirmed", "rejected", "partially_confirmed", "topup_required", "overpaid", "disputed"],
  partially_confirmed: ["topup_required", "confirmed", "rejected", "disputed"],
  topup_required: ["submitted", "confirmed", "rejected", "disputed"],
  confirmed: ["refunding", "refunded", "disputed"],
  rejected: ["unpaid", "submitted", "disputed"],
  overpaid: ["confirmed", "refunding", "refunded", "disputed"],
  refunding: ["confirmed", "refunded", "disputed"],
  refunded: ["disputed"],
  disputed: []
} as const satisfies TransitionMap<PaymentStatus>;

export const refundTransitions = {
  requested: ["approved", "rejected", "cancelled"],
  approved: ["paid_offline", "proof_uploaded", "disputed", "cancelled"],
  rejected: [],
  paid_offline: ["confirmed", "disputed"],
  proof_uploaded: ["confirmed", "disputed"],
  confirmed: [],
  disputed: ["approved", "confirmed", "cancelled"],
  cancelled: []
} as const satisfies TransitionMap<RefundStatus>;

export const checkInTransitions = {
  not_arrived: ["arrived", "exception"],
  arrived: ["exception"],
  exception: ["not_arrived", "arrived"]
} as const satisfies TransitionMap<CheckInStatus>;

export const statusMachines = {
  registration: registrationTransitions,
  payment: paymentTransitions,
  refund: refundTransitions,
  checkIn: checkInTransitions
} as const;

type WorkflowStatus<TWorkflow extends WorkflowName> =
  TWorkflow extends "registration" ? RegistrationStatus :
  TWorkflow extends "payment" ? PaymentStatus :
  TWorkflow extends "refund" ? RefundStatus :
  CheckInStatus;

function getTransitionMap<TWorkflow extends WorkflowName>(workflow: TWorkflow): TransitionMap<WorkflowStatus<TWorkflow>> {
  return statusMachines[workflow] as TransitionMap<WorkflowStatus<TWorkflow>>;
}

export function listNextStatuses<TWorkflow extends WorkflowName>(
  workflow: TWorkflow,
  from: WorkflowStatus<TWorkflow>
): readonly WorkflowStatus<TWorkflow>[] {
  return getTransitionMap(workflow)[from] ?? [];
}

export function canTransition<TWorkflow extends WorkflowName>(
  workflow: TWorkflow,
  from: WorkflowStatus<TWorkflow>,
  to: WorkflowStatus<TWorkflow>
) {
  return listNextStatuses(workflow, from).includes(to);
}

export function assertTransition<TWorkflow extends WorkflowName>(
  workflow: TWorkflow,
  from: WorkflowStatus<TWorkflow>,
  to: WorkflowStatus<TWorkflow>
) {
  if (!canTransition(workflow, from, to)) {
    throw new InvalidStatusTransitionError(workflow, from, to);
  }
}

export function isTerminalStatus<TWorkflow extends WorkflowName>(
  workflow: TWorkflow,
  status: WorkflowStatus<TWorkflow>
) {
  return listNextStatuses(workflow, status).length === 0;
}
