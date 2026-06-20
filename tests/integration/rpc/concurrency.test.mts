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

// This file intentionally targets the same three RPCs that already had
// sequential coverage (review_payment_atomic, check_in_order_atomic,
// create_seat_lock_atomic) but exercises them under real concurrent load
// with Promise.all, the same way the existing capacity-oversell test does
// for create_registration_atomic. Each `for update` row lock in the RPC
// should serialize the two racing callers so exactly one wins and the
// other gets a clear, typed rejection rather than a corrupted/duplicated
// state change.

describe("GatherUp RPC concurrency", { skip: !shouldRunRpcIntegration || !requiredEnvConfigured }, () => {
  let admin: SupabaseClient;
  let owner: TestAuthUser;
  let finance: TestAuthUser;
  let participantOne: TestAuthUser;
  let participantTwo: TestAuthUser;
  let ownerClient: SupabaseClient;
  let financeClient: SupabaseClient;
  let participantOneClient: SupabaseClient;
  let participantTwoClient: SupabaseClient;
  let paymentReviewEventId: string;
  let checkInEventId: string;
  let seatEventId: string;

  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const createdAuthUserIds: string[] = [];
  const createdAppUserIds: string[] = [];
  const createdEventIds: string[] = [];

  before(async () => {
    admin = makeAdminClient();

    owner = await createAuthAndAppUser(admin, suffix, "cc-owner");
    finance = await createAuthAndAppUser(admin, suffix, "cc-finance");
    participantOne = await createAuthAndAppUser(admin, suffix, "cc-p1");
    participantTwo = await createAuthAndAppUser(admin, suffix, "cc-p2");
    createdAuthUserIds.push(owner.authUserId, finance.authUserId, participantOne.authUserId, participantTwo.authUserId);
    createdAppUserIds.push(owner.appUserId, finance.appUserId, participantOne.appUserId, participantTwo.appUserId);

    paymentReviewEventId = await createEvent(admin, owner, suffix, "cc-review", 2);
    checkInEventId = await createEvent(admin, owner, suffix, "cc-checkin", 2);
    seatEventId = await createEvent(admin, owner, suffix, "cc-seat", 2, {
      seatSelectionMode: "after_payment_confirmation"
    });
    createdEventIds.push(paymentReviewEventId, checkInEventId, seatEventId);

    // `finance` is a real second payment manager on paymentReviewEventId so the
    // race in the first test is two *independent* organizer-side identities,
    // not the owner racing against themselves.
    await addEventOrganizer(admin, paymentReviewEventId, finance.appUserId, "finance");
    await addEventOrganizer(admin, checkInEventId, finance.appUserId, "finance");

    ownerClient = await makeSignedInClient(owner.email, owner.password);
    financeClient = await makeSignedInClient(finance.email, finance.password);
    participantOneClient = await makeSignedInClient(participantOne.email, participantOne.password);
    participantTwoClient = await makeSignedInClient(participantTwo.email, participantTwo.password);
  });

  after(async () => {
    await cleanupRpcIntegrationData(admin, {
      eventIds: createdEventIds,
      appUserIds: createdAppUserIds,
      authUserIds: createdAuthUserIds
    });
  });

  it("allows exactly one reviewer to win when two payment managers race the same order", async () => {
    const createResult = await participantOneClient.rpc("create_registration_atomic", rpcPayload(paymentReviewEventId, "race-payment"));

    assert.ifError(createResult.error);
    assert.equal(createResult.data?.success, true);

    const registrationId = createResult.data.registration_id as string;
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("id, amount_cents")
      .eq("registration_id", registrationId)
      .single();

    assert.ifError(paymentError);
    assert.ok(payment?.id);

    const { error: proofError } = await admin.from("payment_proofs").insert({
      payment_id: payment.id,
      registration_id: registrationId,
      file_url: `${paymentReviewEventId}/${registrationId}/${payment.id}/race-proof.png`,
      amount_reported_cents: payment.amount_cents,
      uploaded_by: participantOne.appUserId
    });

    assert.ifError(proofError);

    const [ownerOutcome, financeOutcome] = await Promise.all([
      ownerClient.rpc("review_payment_atomic", {
        p_registration_id: registrationId,
        p_order_number: null,
        p_decision: "APPROVED",
        p_review_note: "owner racing to approve"
      }),
      financeClient.rpc("review_payment_atomic", {
        p_registration_id: registrationId,
        p_order_number: null,
        p_decision: "REJECTED",
        p_review_note: "finance racing to reject"
      })
    ]);

    const outcomes = [ownerOutcome, financeOutcome];
    const successCount = outcomes.filter(({ data, error }) => !error && data?.success === true).length;
    const invalidStatusCount = outcomes.filter(
      ({ data }) => data?.success === false && data.error_code === "INVALID_ORDER_STATUS"
    ).length;

    assert.equal(successCount, 1, "Exactly one of the two racing reviewers should win.");
    assert.equal(invalidStatusCount, 1, "The losing reviewer must get a typed rejection, not a silent no-op or a second write.");

    const { data: finalPayment, error: finalPaymentError } = await admin
      .from("payments")
      .select("status, reviewed_by")
      .eq("id", payment.id)
      .single();

    assert.ifError(finalPaymentError);
    assert.ok(
      ["confirmed", "rejected"].includes(finalPayment?.status ?? ""),
      "Payment must land in exactly one terminal review state, not be left half-updated."
    );
    assert.ok(
      [owner.appUserId, finance.appUserId].includes(finalPayment?.reviewed_by ?? ""),
      "reviewed_by must record whichever identity actually won the race."
    );
  });

  it("allows exactly one check-in when two staff members scan the same code at once", async () => {
    const { registrationId } = await createConfirmedRegistration(
      participantTwoClient,
      admin,
      ownerClient,
      checkInEventId,
      participantTwo.appUserId,
      "race-checkin"
    );

    const { data: order, error: orderError } = await admin
      .from("registrations")
      .select("check_in_code")
      .eq("id", registrationId)
      .single();

    assert.ifError(orderError);
    assert.ok(order?.check_in_code);

    const [gateAScan, gateBScan] = await Promise.all([
      ownerClient.rpc("check_in_order_atomic", { p_check_in_code: order.check_in_code, p_note: "gate A" }),
      financeClient.rpc("check_in_order_atomic", { p_check_in_code: order.check_in_code, p_note: "gate B" })
    ]);

    const scans = [gateAScan, gateBScan];
    const successCount = scans.filter(({ data, error }) => !error && data?.success === true).length;
    const alreadyCheckedInCount = scans.filter(
      ({ data }) => data?.success === false && data.error_code === "ALREADY_CHECKED_IN"
    ).length;

    assert.equal(successCount, 1, "Exactly one gate scan should win the race.");
    assert.equal(alreadyCheckedInCount, 1, "The losing scan must be told the order is already checked in, not silently dropped.");

    const { count: checkInRowCount, error: checkInCountError } = await admin
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("registration_id", registrationId);

    assert.ifError(checkInCountError);
    assert.equal(checkInRowCount, 1, "Only one check_ins row should ever be written for this order, even under a race.");
  });

  it("lets exactly one participant lock a seat when two confirmed orders compete for it", async () => {
    const { data: seat, error: seatError } = await admin
      .from("seats")
      .insert({
        event_id: seatEventId,
        row_label: "A",
        seat_number: 1,
        display_label: "A1"
      })
      .select("id")
      .single();

    assert.ifError(seatError);
    assert.ok(seat?.id);

    const registrationOne = await createConfirmedRegistration(
      participantOneClient,
      admin,
      ownerClient,
      seatEventId,
      participantOne.appUserId,
      "race-seat-one"
    );
    const registrationTwo = await createConfirmedRegistration(
      participantTwoClient,
      admin,
      ownerClient,
      seatEventId,
      participantTwo.appUserId,
      "race-seat-two"
    );

    // Seat selection only opens once payment is confirmed for everyone, so we
    // flip the event into seat_selection_open after both orders are confirmed
    // rather than at event-creation time (create_registration_atomic requires
    // status = 'registration_open').
    const { error: openSeatsError } = await admin
      .from("events")
      .update({ status: "seat_selection_open" })
      .eq("id", seatEventId);

    assert.ifError(openSeatsError);

    const [lockOne, lockTwo] = await Promise.all([
      participantOneClient.rpc("create_seat_lock_atomic", {
        p_registration_id: registrationOne.registrationId,
        p_seat_id: seat.id
      }),
      participantTwoClient.rpc("create_seat_lock_atomic", {
        p_registration_id: registrationTwo.registrationId,
        p_seat_id: seat.id
      })
    ]);

    const attempts = [lockOne, lockTwo];
    const successCount = attempts.filter(({ data, error }) => !error && data?.success === true).length;
    const rejectedCount = attempts.filter(
      ({ data }) =>
        data?.success === false &&
        ["SEAT_UNAVAILABLE", "SEAT_CONFLICT", "SEAT_ALREADY_ASSIGNED"].includes(data.error_code as string)
    ).length;

    assert.equal(successCount, 1, "Exactly one participant should win the contested seat.");
    assert.equal(rejectedCount, 1, "The losing participant must get a typed seat-unavailable rejection, never a double lock.");

    const { count: activeLockCount, error: activeLockError } = await admin
      .from("seat_locks")
      .select("id", { count: "exact", head: true })
      .eq("seat_id", seat.id)
      .eq("status", "active");

    assert.ifError(activeLockError);
    assert.equal(activeLockCount, 1, "Only one active lock should exist for the contested seat, even under a race.");
  });
});
