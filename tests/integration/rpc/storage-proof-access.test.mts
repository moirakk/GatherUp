import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { type SupabaseClient } from "@supabase/supabase-js";

import {
  addEventOrganizer,
  cleanupRpcIntegrationData,
  createAuthAndAppUser,
  createConfirmedRegistration,
  createEvent,
  makeAdminClient,
  makeSignedInClient,
  requiredEnvConfigured,
  rpcPayload,
  shouldRunRpcIntegration,
  type TestAuthUser
} from "./_helpers.mts";

// supabase/storage.sql defines these policies for payment-proofs:
//   insert: only the registration owner, and only while their order is
//           awaiting_payment / payment_rejected_resubmittable / partial_paid_needs_topup
//   select: registration owner, OR can_manage_event_payments(event_id), OR platform admin
// and for refund-proofs:
//   insert: only can_handle_event_refunds(event_id) (owner/finance), never the participant
//   select: registration owner, OR can_handle_event_refunds(event_id), OR platform admin
//
// can_manage_event_payments() grants owner, finance, and a cohost *only* if
// `permissions.can_manage_payments = true`. can_handle_event_refunds() grants
// owner and finance only -- cohost is excluded even with full permissions.
// This file proves those rules hold against real Supabase Storage, not just
// that the SQL executes without a syntax error.

const fixtureBytes = Buffer.from("gatherup-integration-test-fixture");

async function uploadFixture(client: SupabaseClient, bucket: string, path: string) {
  return client.storage.from(bucket).upload(path, fixtureBytes, {
    contentType: "image/png",
    upsert: false
  });
}

async function canRead(client: SupabaseClient, bucket: string, path: string) {
  const { data, error } = await client.storage.from(bucket).download(path);
  return !error && data !== null;
}

describe("GatherUp Storage RLS", { skip: !shouldRunRpcIntegration || !requiredEnvConfigured }, () => {
  let admin: SupabaseClient;
  let owner: TestAuthUser;
  let cohostNoPermission: TestAuthUser;
  let registrationOwner: TestAuthUser;
  let outsider: TestAuthUser;
  let ownerClient: SupabaseClient;
  let cohostClient: SupabaseClient;
  let registrationOwnerClient: SupabaseClient;
  let outsiderClient: SupabaseClient;

  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const createdAuthUserIds: string[] = [];
  const createdAppUserIds: string[] = [];
  const createdEventIds: string[] = [];
  const uploadedObjects: Array<{ bucket: string; path: string }> = [];

  before(async () => {
    admin = makeAdminClient();

    owner = await createAuthAndAppUser(admin, suffix, "st-owner");
    cohostNoPermission = await createAuthAndAppUser(admin, suffix, "st-cohost");
    registrationOwner = await createAuthAndAppUser(admin, suffix, "st-regowner");
    outsider = await createAuthAndAppUser(admin, suffix, "st-outsider");
    createdAuthUserIds.push(owner.authUserId, cohostNoPermission.authUserId, registrationOwner.authUserId, outsider.authUserId);
    createdAppUserIds.push(owner.appUserId, cohostNoPermission.appUserId, registrationOwner.appUserId, outsider.appUserId);

    ownerClient = await makeSignedInClient(owner.email, owner.password);
    cohostClient = await makeSignedInClient(cohostNoPermission.email, cohostNoPermission.password);
    registrationOwnerClient = await makeSignedInClient(registrationOwner.email, registrationOwner.password);
    outsiderClient = await makeSignedInClient(outsider.email, outsider.password);
  });

  after(async () => {
    for (const object of uploadedObjects) {
      const { error } = await admin.storage.from(object.bucket).remove([object.path]);
      if (error) {
        console.warn(`Storage RLS cleanup failed for ${object.bucket}/${object.path}: ${error.message}`);
      }
    }

    await cleanupRpcIntegrationData(admin, {
      eventIds: createdEventIds,
      appUserIds: createdAppUserIds,
      authUserIds: createdAuthUserIds
    });
  });

  async function createTestEvent(label: string) {
    const eventId = await createEvent(admin, owner, suffix, label, 5);
    createdEventIds.push(eventId);
    return eventId;
  }

  async function createPendingRegistration(client: SupabaseClient, eventId: string, nickname: string) {
    const createResult = await client.rpc("create_registration_atomic", rpcPayload(eventId, nickname));

    assert.ifError(createResult.error);
    assert.equal(createResult.data?.success, true);

    const registrationId = createResult.data.registration_id as string;
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("id")
      .eq("registration_id", registrationId)
      .single();

    assert.ifError(paymentError);
    assert.ok(payment?.id);

    return { registrationId, paymentId: payment.id as string };
  }

  it("only lets the registration owner upload to their own payment-proofs path", async () => {
    const eventId = await createTestEvent("st-pay-own");
    const { registrationId, paymentId } = await createPendingRegistration(registrationOwnerClient, eventId, "storage-upload-owner");

    const path = `${eventId}/${registrationId}/${paymentId}/owner-upload.png`;

    const outsiderAttempt = await uploadFixture(outsiderClient, "payment-proofs", path);
    assert.ok(outsiderAttempt.error, "An outsider must not be able to upload into someone else's payment-proofs path.");

    const ownerAttempt = await uploadFixture(registrationOwnerClient, "payment-proofs", path);
    assert.ifError(ownerAttempt.error);
    uploadedObjects.push({ bucket: "payment-proofs", path });
  });

  it("restricts payment-proofs reads to the order owner and payment managers, not a permission-less cohost", async () => {
    const eventId = await createTestEvent("st-pay-read");
    await addEventOrganizer(admin, eventId, cohostNoPermission.appUserId, "cohost", {});

    const { registrationId, paymentId } = await createConfirmedRegistration(
      registrationOwnerClient,
      admin,
      ownerClient,
      eventId,
      registrationOwner.appUserId,
      "storage-read-payment"
    );

    const path = `${eventId}/${registrationId}/${paymentId}/read-check.png`;
    const upload = await admin.storage.from("payment-proofs").upload(path, fixtureBytes, {
      contentType: "image/png",
      upsert: false
    });

    assert.ifError(upload.error);
    uploadedObjects.push({ bucket: "payment-proofs", path });

    assert.equal(await canRead(registrationOwnerClient, "payment-proofs", path), true, "Order owner must be able to read their own proof.");
    assert.equal(await canRead(ownerClient, "payment-proofs", path), true, "Event owner must be able to read proofs for their event.");
    assert.equal(
      await canRead(outsiderClient, "payment-proofs", path),
      false,
      "An unrelated participant must never be able to read someone else's payment proof."
    );
    assert.equal(
      await canRead(cohostClient, "payment-proofs", path),
      false,
      "A cohost without can_manage_payments must not be able to read payment proofs."
    );
  });

  it("never lets a participant upload their own refund-proofs file, only refund managers", async () => {
    const eventId = await createTestEvent("st-ref-up");

    const { registrationId } = await createConfirmedRegistration(
      registrationOwnerClient,
      admin,
      ownerClient,
      eventId,
      registrationOwner.appUserId,
      "storage-refund-upload"
    );

    const refundRequestResult = await registrationOwnerClient.rpc("request_refund_atomic", {
      p_registration_id: registrationId,
      p_requested_amount_cents: 100,
      p_reason: "storage integration test refund"
    });

    assert.ifError(refundRequestResult.error);
    assert.equal(refundRequestResult.data?.success, true);

    const refundRequestId = refundRequestResult.data.refund_request_id as string;
    const path = `${eventId}/${refundRequestId}/upload-check.png`;

    const participantAttempt = await uploadFixture(registrationOwnerClient, "refund-proofs", path);
    assert.ok(
      participantAttempt.error,
      "Refund proofs are uploaded by the organizer after they pay back offline -- the participant must not be able to upload their own."
    );

    const ownerAttempt = await uploadFixture(ownerClient, "refund-proofs", path);
    assert.ifError(ownerAttempt.error);
    uploadedObjects.push({ bucket: "refund-proofs", path });
  });

  it("restricts refund-proofs reads to the order owner and refund managers, excluding cohost even with payment permissions", async () => {
    const eventId = await createTestEvent("st-ref-read");
    await addEventOrganizer(admin, eventId, cohostNoPermission.appUserId, "cohost", { can_manage_payments: true });

    const { registrationId } = await createConfirmedRegistration(
      registrationOwnerClient,
      admin,
      ownerClient,
      eventId,
      registrationOwner.appUserId,
      "storage-refund-read"
    );

    const refundRequestResult = await registrationOwnerClient.rpc("request_refund_atomic", {
      p_registration_id: registrationId,
      p_requested_amount_cents: 100,
      p_reason: "storage integration test refund read"
    });

    assert.ifError(refundRequestResult.error);
    assert.equal(refundRequestResult.data?.success, true);

    const refundRequestId = refundRequestResult.data.refund_request_id as string;
    const path = `${eventId}/${refundRequestId}/read-check.png`;
    const upload = await admin.storage.from("refund-proofs").upload(path, fixtureBytes, {
      contentType: "image/png",
      upsert: false
    });

    assert.ifError(upload.error);
    uploadedObjects.push({ bucket: "refund-proofs", path });

    assert.equal(
      await canRead(registrationOwnerClient, "refund-proofs", path),
      true,
      "The participant who owns the refund must be able to read their own transfer proof."
    );
    assert.equal(await canRead(ownerClient, "refund-proofs", path), true, "Event owner must be able to read refund proofs for their event.");
    assert.equal(
      await canRead(outsiderClient, "refund-proofs", path),
      false,
      "An unrelated participant must never be able to read someone else's refund proof."
    );
    assert.equal(
      await canRead(cohostClient, "refund-proofs", path),
      false,
      "can_handle_event_refunds only grants owner/finance -- a cohost must stay locked out of refund proofs even with can_manage_payments = true."
    );
  });

  it("blocks same-event participants from uploading into another participant's payment-proofs path", async () => {
    const eventId = await createTestEvent("st-pay-peer");
    const victim = await createPendingRegistration(registrationOwnerClient, eventId, "storage-victim");
    const attacker = await createPendingRegistration(outsiderClient, eventId, "storage-attacker");

    const victimPath = `${eventId}/${victim.registrationId}/${victim.paymentId}/peer-attack.png`;
    const attackerPath = `${eventId}/${attacker.registrationId}/${attacker.paymentId}/attacker-own.png`;

    const peerAttempt = await uploadFixture(outsiderClient, "payment-proofs", victimPath);
    assert.ok(
      peerAttempt.error,
      "A participant in the same event must still be unable to upload proof into another registration/payment path."
    );

    const ownAttempt = await uploadFixture(outsiderClient, "payment-proofs", attackerPath);
    assert.ifError(ownAttempt.error);
    uploadedObjects.push({ bucket: "payment-proofs", path: attackerPath });
  });

  it("blocks replacement payment-proof uploads after the order is confirmed", async () => {
    const eventId = await createTestEvent("st-pay-lock");
    const { registrationId, paymentId } = await createConfirmedRegistration(
      registrationOwnerClient,
      admin,
      ownerClient,
      eventId,
      registrationOwner.appUserId,
      "storage-confirmed-no-reupload"
    );

    const path = `${eventId}/${registrationId}/${paymentId}/after-confirmed.png`;
    const upload = await uploadFixture(registrationOwnerClient, "payment-proofs", path);

    assert.ok(upload.error, "A confirmed registration must not accept new participant-uploaded payment proofs.");
  });

  it("rejects malformed proof paths before they can match a Storage policy", async () => {
    const badPaymentPath = "not-a-uuid/not-a-registration/not-a-payment/bad-payment.png";
    const badRefundPath = "not-a-uuid/not-a-refund/bad-refund.png";

    const paymentAttempt = await uploadFixture(registrationOwnerClient, "payment-proofs", badPaymentPath);
    assert.ok(paymentAttempt.error, "Malformed payment-proof paths must be rejected by Storage RLS.");

    const refundAttempt = await uploadFixture(ownerClient, "refund-proofs", badRefundPath);
    assert.ok(refundAttempt.error, "Malformed refund-proof paths must be rejected by Storage RLS.");
  });

  it("keeps payment-proof objects immutable for authenticated participants", async () => {
    const eventId = await createTestEvent("st-pay-imm");
    const { registrationId, paymentId } = await createPendingRegistration(registrationOwnerClient, eventId, "storage-payment-immutable");
    const path = `${eventId}/${registrationId}/${paymentId}/immutable.png`;
    const upload = await uploadFixture(registrationOwnerClient, "payment-proofs", path);

    assert.ifError(upload.error);
    uploadedObjects.push({ bucket: "payment-proofs", path });

    const update = await registrationOwnerClient.storage.from("payment-proofs").update(path, Buffer.from("changed"), {
      contentType: "image/png",
      upsert: true
    });
    assert.ok(update.error, "Payment proofs must not be mutable after upload.");

    const remove = await registrationOwnerClient.storage.from("payment-proofs").remove([path]);
    assert.ok(remove.error, "Payment proofs must not be deletable by authenticated participants.");
  });

  it("keeps refund-proof objects immutable for authenticated refund managers", async () => {
    const eventId = await createTestEvent("st-ref-imm");
    const { registrationId } = await createConfirmedRegistration(
      registrationOwnerClient,
      admin,
      ownerClient,
      eventId,
      registrationOwner.appUserId,
      "storage-refund-immutable"
    );

    const refundRequestResult = await registrationOwnerClient.rpc("request_refund_atomic", {
      p_registration_id: registrationId,
      p_requested_amount_cents: 100,
      p_reason: "storage integration test immutable refund proof"
    });

    assert.ifError(refundRequestResult.error);
    assert.equal(refundRequestResult.data?.success, true);

    const refundRequestId = refundRequestResult.data.refund_request_id as string;
    const path = `${eventId}/${refundRequestId}/immutable.png`;
    const upload = await uploadFixture(ownerClient, "refund-proofs", path);

    assert.ifError(upload.error);
    uploadedObjects.push({ bucket: "refund-proofs", path });

    const update = await ownerClient.storage.from("refund-proofs").update(path, Buffer.from("changed"), {
      contentType: "image/png",
      upsert: true
    });
    assert.ok(update.error, "Refund proofs must not be mutable after upload.");

    const remove = await ownerClient.storage.from("refund-proofs").remove([path]);
    assert.ok(remove.error, "Refund proofs must not be deletable by authenticated refund managers.");
  });
});
