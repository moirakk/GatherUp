import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  createNotificationQueueItems,
  listNotificationTemplateKeys,
  toNotificationDeliveryInsert
} from "../src/domain/notification-queue.ts";
import { createWorkflowTransitionEvent } from "../src/domain/workflow-events.ts";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const schema = readFileSync(join(repoRoot, "supabase", "schema.sql"), "utf8");

function extractSchemaNotificationTemplateKeys() {
  const keys = new Set<string>();

  for (const block of extractSchemaNotificationInsertBlocks()) {
    for (const match of block.matchAll(/\n\s+'([a-z]+_[a-z_]+)',\n\s+'[A-Z]/g)) {
      keys.add(match[1]);
    }

    for (const match of block.matchAll(/then '([a-z]+_[a-z_]+)' else '([a-z]+_[a-z_]+)' end/g)) {
      keys.add(match[1]);
      keys.add(match[2]);
    }
  }

  return Array.from(keys).sort();
}

function extractSchemaNotificationInsertBlocks() {
  return schema.match(/insert into public\.notification_deliveries \([\s\S]*?\n {2}\);/g) ?? [];
}

describe("notification queue contract", () => {
  it("queues participant notifications for confirmed registrations", () => {
    const event = createWorkflowTransitionEvent("registration", "payment_submitted", "confirmed");
    const items = createNotificationQueueItems(event, {
      eventId: "event-1",
      eventName: "Sakamoto Screening",
      orderNumber: "RYU-0001",
      registrationId: "registration-1",
      participantUserIds: ["user-1"]
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].templateKey, "registration_confirmed");
    assert.equal(items[0].recipientId, "user-1");
    assert.equal(items[0].channel, "in_app");
    assert.equal(items[0].eventId, "event-1");
    assert.match(items[0].title, /Registration confirmed/);
    assert.match(items[0].body, /Sakamoto Screening/);
    assert.equal(items[0].metadata.workflow, "registration");
    assert.equal(items[0].metadata.to, "confirmed");
  });

  it("queues organizer notifications across requested channels for payment proof submissions", () => {
    const event = createWorkflowTransitionEvent("registration", "awaiting_payment", "payment_submitted");
    const items = createNotificationQueueItems(event, {
      eventName: "Birthday Cafe",
      orderNumber: "CAF-0002",
      organizerUserIds: ["owner-1", "finance-1"],
      channels: ["in_app", "email"]
    });

    assert.equal(items.length, 4);
    assert.deepEqual(items.map((item) => `${item.recipientId}:${item.channel}`).sort(), [
      "finance-1:email",
      "finance-1:in_app",
      "owner-1:email",
      "owner-1:in_app"
    ]);
    assert.equal(
      items.every((item) => item.templateKey === "payment_proof_submitted"),
      true
    );
  });

  it("does not queue notifications for auditable but silent transitions", () => {
    const event = createWorkflowTransitionEvent("checkIn", "not_arrived", "arrived");
    const items = createNotificationQueueItems(event, {
      eventName: "Campus Fair",
      orderNumber: "CHK-0003",
      participantUserIds: ["user-1"]
    });

    assert.deepEqual(items, []);
  });

  it("does not queue notifications when the target audience has no recipients", () => {
    const event = createWorkflowTransitionEvent("refund", "proof_uploaded", "disputed");
    const items = createNotificationQueueItems(event, {
      eventName: "Refund Test",
      refundRequestId: "refund-1",
      participantUserIds: ["participant-1"]
    });

    assert.deepEqual(items, []);
  });

  it("keeps core workflow templates registered", () => {
    const keys = listNotificationTemplateKeys();

    assert.ok(keys.includes("registration_confirmed"));
    assert.ok(keys.includes("registration_awaiting_payment"));
    assert.ok(keys.includes("seat_confirmed"));
    assert.ok(keys.includes("payment_proof_submitted"));
    assert.ok(keys.includes("refund_disputed"));
    assert.ok(keys.includes("check_in_confirmed"));
    assert.ok(keys.includes("check_in_exception"));
  });

  it("keeps Supabase notification inserts aligned with registered templates", () => {
    const registeredKeys = new Set(listNotificationTemplateKeys());

    for (const key of extractSchemaNotificationTemplateKeys()) {
      assert.equal(registeredKeys.has(key), true, `Missing notification template ${key}`);
    }
  });

  it("keeps Supabase in-app notifications immediately visible", () => {
    const blocks = extractSchemaNotificationInsertBlocks();

    assert.ok(blocks.length > 0, "Expected Supabase notification inserts");

    for (const block of blocks) {
      assert.match(block, /'in_app'/);
      assert.match(block, /'sent'/);
      assert.match(block, /sent_at/);
    }
  });

  it("maps queue items to notification_deliveries insert payloads", () => {
    const event = createWorkflowTransitionEvent("registration", "payment_submitted", "confirmed");
    const [item] = createNotificationQueueItems(event, {
      eventId: "event-1",
      eventName: "Sakamoto Screening",
      orderNumber: "RYU-0001",
      participantUserIds: ["user-1"]
    });

    const insert = toNotificationDeliveryInsert(item);

    assert.equal(insert.event_id, "event-1");
    assert.equal(insert.recipient_id, "user-1");
    assert.equal(insert.channel, "in_app");
    assert.equal(insert.status, "pending");
    assert.equal(insert.template_key, "registration_confirmed");
    assert.equal(insert.title, item.title);
    assert.equal(insert.body, item.body);
    assert.equal(insert.metadata.orderNumber, "RYU-0001");
  });
});
