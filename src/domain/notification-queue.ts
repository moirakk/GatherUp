import type { WorkflowAudience, WorkflowTransitionEvent } from "./workflow-events.ts";

export type NotificationChannel = "in_app" | "email" | "wechat";

export type NotificationQueueContext = {
  eventId?: string;
  eventName?: string;
  orderNumber?: string;
  registrationId?: string;
  paymentId?: string;
  refundRequestId?: string;
  participantUserIds?: readonly string[];
  organizerUserIds?: readonly string[];
  financeUserIds?: readonly string[];
  staffUserIds?: readonly string[];
  adminUserIds?: readonly string[];
  channels?: readonly NotificationChannel[];
};

export type NotificationQueueItem = {
  templateKey: string;
  recipientId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  eventId?: string;
  metadata: Record<string, string>;
};

export type NotificationDeliveryInsert = {
  event_id?: string;
  recipient_id: string;
  channel: NotificationChannel;
  status: "pending";
  template_key: string;
  title: string;
  body: string;
  metadata: Record<string, string>;
};

type NotificationTemplate = {
  title: string;
  body: string;
};

const notificationTemplates: Record<string, NotificationTemplate> = {
  payment_proof_submitted: {
    title: "New payment proof needs review",
    body: "A participant submitted payment proof for {eventName}. Please review order {orderNumber}."
  },
  payment_rejected: {
    title: "Payment proof needs resubmission",
    body: "Your payment proof for {eventName} was rejected. Please update order {orderNumber}."
  },
  payment_topup_required: {
    title: "Additional payment is required",
    body: "Order {orderNumber} for {eventName} needs an additional payment before confirmation."
  },
  payment_confirmed: {
    title: "Payment confirmed",
    body: "Your payment for {eventName} has been confirmed."
  },
  registration_confirmed: {
    title: "Registration confirmed",
    body: "Your registration for {eventName} is confirmed. Order {orderNumber} is ready for the next step."
  },
  registration_awaiting_payment: {
    title: "Registration created",
    body: "Order {orderNumber} for {eventName} is ready. Please submit payment proof."
  },
  registration_waitlisted: {
    title: "You are on the waitlist",
    body: "You have joined the waitlist for {eventName}. We will notify you if a spot opens."
  },
  registration_cancelled: {
    title: "Registration cancelled",
    body: "Order {orderNumber} for {eventName} has been cancelled."
  },
  registration_expired: {
    title: "Registration expired",
    body: "Order {orderNumber} for {eventName} expired before completion."
  },
  seat_confirmed: {
    title: "Seat confirmed",
    body: "Your seat for order {orderNumber} has been confirmed."
  },
  refund_started: {
    title: "Refund started",
    body: "A refund workflow has started for order {orderNumber}."
  },
  refund_approved: {
    title: "Refund approved",
    body: "Your refund request for order {orderNumber} has been approved."
  },
  refund_rejected: {
    title: "Refund rejected",
    body: "Your refund request for order {orderNumber} was rejected. Check the organizer note for details."
  },
  refund_paid_offline: {
    title: "Refund marked as paid",
    body: "The organizer marked your refund for order {orderNumber} as paid offline."
  },
  refund_proof_uploaded: {
    title: "Refund proof uploaded",
    body: "Refund transfer proof has been uploaded for order {orderNumber}."
  },
  refund_confirmed: {
    title: "Refund confirmed",
    body: "A participant confirmed receipt for refund request {refundRequestId}."
  },
  refund_completed: {
    title: "Refund completed",
    body: "Refund processing for order {orderNumber} has been completed."
  },
  refund_disputed: {
    title: "Refund dispute needs review",
    body: "Refund request {refundRequestId} for {eventName} has entered dispute review."
  },
  refund_cancelled: {
    title: "Refund request cancelled",
    body: "Refund request {refundRequestId} for order {orderNumber} was cancelled."
  },
  payment_disputed: {
    title: "Payment dispute needs review",
    body: "Order {orderNumber} for {eventName} has entered payment dispute review."
  },
  check_in_exception: {
    title: "Check-in exception",
    body: "Order {orderNumber} for {eventName} needs staff review at check-in."
  },
  check_in_confirmed: {
    title: "Check-in confirmed",
    body: "Order {orderNumber} has been checked in."
  }
};

function unique(values: readonly string[] = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function recipientsForAudience(audience: WorkflowAudience, context: NotificationQueueContext) {
  if (audience === "participant") return unique(context.participantUserIds);
  if (audience === "organizer") return unique(context.organizerUserIds);
  if (audience === "finance") return unique(context.financeUserIds);
  if (audience === "staff") return unique(context.staffUserIds);
  if (audience === "admin") return unique(context.adminUserIds);
  return [];
}

function interpolate(template: string, context: NotificationQueueContext) {
  const values: Record<string, string> = {
    eventName: context.eventName ?? "this event",
    orderNumber: context.orderNumber ?? "the order",
    refundRequestId: context.refundRequestId ?? "the refund request"
  };

  return template.replace(/\{([a-zA-Z]+)\}/g, (match, key: string) => values[key] ?? match);
}

function notificationMetadata(event: WorkflowTransitionEvent, context: NotificationQueueContext) {
  return Object.fromEntries(
    Object.entries({
      workflow: event.workflow,
      from: event.from,
      to: event.to,
      auditAction: event.auditAction,
      riskLevel: event.riskLevel,
      eventId: context.eventId,
      registrationId: context.registrationId,
      paymentId: context.paymentId,
      refundRequestId: context.refundRequestId,
      orderNumber: context.orderNumber
    }).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)
  );
}

export function createNotificationQueueItems(
  event: WorkflowTransitionEvent,
  context: NotificationQueueContext
): NotificationQueueItem[] {
  if (!event.notificationType || event.audience === "none") {
    return [];
  }

  const template = notificationTemplates[event.notificationType];
  if (!template) {
    return [];
  }

  const recipients = recipientsForAudience(event.audience, context);
  const channels: readonly NotificationChannel[] = context.channels?.length ? context.channels : ["in_app"];
  const metadata = notificationMetadata(event, context);

  return recipients.flatMap((recipientId) =>
    channels.map((channel) => ({
      templateKey: event.notificationType as string,
      recipientId,
      channel,
      title: interpolate(template.title, context),
      body: interpolate(template.body, context),
      eventId: context.eventId,
      metadata
    }))
  );
}

export function listNotificationTemplateKeys() {
  return Object.keys(notificationTemplates).sort();
}

export function toNotificationDeliveryInsert(item: NotificationQueueItem): NotificationDeliveryInsert {
  return {
    event_id: item.eventId,
    recipient_id: item.recipientId,
    channel: item.channel,
    status: "pending",
    template_key: item.templateKey,
    title: item.title,
    body: item.body,
    metadata: item.metadata
  };
}
