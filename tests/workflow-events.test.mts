import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidStatusTransitionError } from "../src/domain/status-machine.ts";
import {
  createWorkflowTransitionEvent,
  shouldCreateNotification,
  shouldWriteAuditLog
} from "../src/domain/workflow-events.ts";

describe("workflow transition events", () => {
  it("creates organizer notification events when payment proof is submitted", () => {
    const event = createWorkflowTransitionEvent("registration", "awaiting_payment", "payment_submitted");

    assert.equal(event.auditAction, "registration.payment_submitted");
    assert.equal(event.notificationType, "payment_proof_submitted");
    assert.equal(event.audience, "organizer");
    assert.equal(event.riskLevel, "medium");
    assert.equal(shouldCreateNotification(event), true);
    assert.equal(shouldWriteAuditLog(event), true);
  });

  it("creates participant notification events when registration is confirmed", () => {
    const event = createWorkflowTransitionEvent("registration", "payment_submitted", "confirmed");

    assert.equal(event.auditAction, "registration.confirmed");
    assert.equal(event.notificationType, "registration_confirmed");
    assert.equal(event.audience, "participant");
    assert.equal(shouldCreateNotification(event), true);
  });

  it("keeps check-in arrival auditable without creating noisy participant notifications", () => {
    const event = createWorkflowTransitionEvent("checkIn", "not_arrived", "arrived");

    assert.equal(event.auditAction, "check_in.arrived");
    assert.equal(event.notificationType, null);
    assert.equal(event.audience, "none");
    assert.equal(event.riskLevel, "low");
    assert.equal(shouldCreateNotification(event), false);
    assert.equal(shouldWriteAuditLog(event), true);
  });

  it("marks disputes as high-risk finance events", () => {
    const event = createWorkflowTransitionEvent("refund", "proof_uploaded", "disputed");

    assert.equal(event.auditAction, "refund.disputed");
    assert.equal(event.notificationType, "refund_disputed");
    assert.equal(event.audience, "finance");
    assert.equal(event.riskLevel, "high");
  });

  it("notifies participants when a waitlist invitation opens", () => {
    const event = createWorkflowTransitionEvent("waitlist", "waiting", "invited");

    assert.equal(event.auditAction, "waitlist.invited");
    assert.equal(event.notificationType, "waitlist_invited");
    assert.equal(event.audience, "participant");
    assert.equal(event.riskLevel, "medium");
    assert.equal(shouldCreateNotification(event), true);
    assert.equal(shouldWriteAuditLog(event), true);
  });

  it("keeps skipped waitlist entries auditable but quiet", () => {
    const event = createWorkflowTransitionEvent("waitlist", "invited", "skipped");

    assert.equal(event.auditAction, "waitlist.skipped");
    assert.equal(event.notificationType, null);
    assert.equal(event.audience, "none");
    assert.equal(event.riskLevel, "medium");
    assert.equal(shouldCreateNotification(event), false);
    assert.equal(shouldWriteAuditLog(event), true);
  });

  it("rejects invalid transitions before deriving side effects", () => {
    assert.throws(
      () => createWorkflowTransitionEvent("payment", "unpaid", "confirmed"),
      InvalidStatusTransitionError
    );
  });
});
