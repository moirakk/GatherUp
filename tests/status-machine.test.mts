import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  InvalidStatusTransitionError,
  assertTransition,
  canTransition,
  checkInStatuses,
  isTerminalStatus,
  listNextStatuses,
  paymentStatuses,
  refundStatuses,
  registrationStatuses,
  waitlistStatuses,
  statusMachines,
  type WorkflowName
} from "../src/domain/status-machine.ts";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const schema = readFileSync(join(repoRoot, "supabase", "schema.sql"), "utf8");

function extractEnumValues(name: string) {
  const match = schema.match(new RegExp(`create type ${name} as enum \\((.*?)\\);`, "s"));
  assert.ok(match, `Missing enum ${name}`);
  return Array.from(match[1].matchAll(/'([^']+)'/g), (valueMatch) => valueMatch[1]);
}

function assertSameMembers(actual: readonly string[], expected: readonly string[], label: string) {
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${label} members should stay aligned`);
}

describe("domain status machines", () => {
  it("stays aligned with Supabase enum values", () => {
    assertSameMembers(registrationStatuses, extractEnumValues("registration_status"), "registration_status");
    assertSameMembers(paymentStatuses, extractEnumValues("payment_status"), "payment_status");
    assertSameMembers(refundStatuses, extractEnumValues("refund_status"), "refund_status");
    assertSameMembers(waitlistStatuses, extractEnumValues("waitlist_status"), "waitlist_status");
    assertSameMembers(checkInStatuses, extractEnumValues("check_in_status"), "check_in_status");
  });

  it("defines every known status as a state in its workflow machine", () => {
    const workflows: Record<WorkflowName, readonly string[]> = {
      registration: registrationStatuses,
      payment: paymentStatuses,
      refund: refundStatuses,
      waitlist: waitlistStatuses,
      checkIn: checkInStatuses
    };

    for (const [workflow, statuses] of Object.entries(workflows) as Array<[WorkflowName, readonly string[]]>) {
      assertSameMembers(Object.keys(statusMachines[workflow]), statuses, workflow);
    }
  });

  it("allows expected happy-path transitions", () => {
    assert.equal(canTransition("registration", "awaiting_payment", "payment_submitted"), true);
    assert.equal(canTransition("registration", "payment_submitted", "confirmed"), true);
    assert.equal(canTransition("registration", "confirmed", "refunding"), true);
    assert.equal(canTransition("payment", "submitted", "confirmed"), true);
    assert.equal(canTransition("payment", "confirmed", "refunding"), true);
    assert.equal(canTransition("refund", "requested", "approved"), true);
    assert.equal(canTransition("refund", "approved", "proof_uploaded"), true);
    assert.equal(canTransition("waitlist", "waiting", "invited"), true);
    assert.equal(canTransition("waitlist", "invited", "converted"), true);
    assert.equal(canTransition("checkIn", "not_arrived", "arrived"), true);
  });

  it("blocks unsafe jumps across workflows", () => {
    assert.equal(canTransition("registration", "awaiting_payment", "confirmed"), false);
    assert.equal(canTransition("registration", "payment_submitted", "refunded"), false);
    assert.equal(canTransition("payment", "unpaid", "confirmed"), false);
    assert.equal(canTransition("refund", "requested", "confirmed"), false);
    assert.equal(canTransition("waitlist", "waiting", "converted"), false);
    assert.equal(canTransition("waitlist", "expired", "invited"), false);
    assert.equal(canTransition("checkIn", "arrived", "not_arrived"), false);
  });

  it("throws a domain error when asserting an invalid transition", () => {
    assert.throws(
      () => assertTransition("registration", "awaiting_payment", "confirmed"),
      InvalidStatusTransitionError
    );
  });

  it("exposes terminal states for workflow completion and analytics", () => {
    assert.equal(isTerminalStatus("registration", "refunded"), true);
    assert.equal(isTerminalStatus("registration", "confirmed"), false);
    assert.equal(isTerminalStatus("payment", "disputed"), true);
    assert.equal(isTerminalStatus("refund", "confirmed"), true);
    assert.equal(isTerminalStatus("waitlist", "converted"), true);
    assert.equal(isTerminalStatus("waitlist", "waiting"), false);
    assert.deepEqual(listNextStatuses("refund", "rejected"), []);
  });
});
