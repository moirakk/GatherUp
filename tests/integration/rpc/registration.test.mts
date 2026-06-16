import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const shouldRun = process.env.GATHERUP_RUN_RPC_INTEGRATION === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const requiredEnvConfigured = Boolean(supabaseUrl && anonKey && serviceRoleKey);

type TestAuthUser = {
  appUserId: string;
  authUserId: string;
  email: string;
  password: string;
  publicId: string;
};

function makeAdminClient() {
  assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required.");
  assert.ok(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY is required.");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

function makeAnonClient() {
  assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required.");
  assert.ok(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

async function makeSignedInClient(email: string, password: string) {
  const anon = makeAnonClient();
  const { data, error } = await anon.auth.signInWithPassword({ email, password });

  assert.ifError(error);
  assert.ok(data.session?.access_token, `Expected access token for ${email}.`);

  return createClient(supabaseUrl as string, anonKey as string, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`
      }
    }
  });
}

function rpcPayload(eventId: string, nickname: string) {
  return {
    p_event_id: eventId,
    p_nickname: nickname,
    p_contact_type: "email",
    p_contact_value: `${nickname.toLowerCase()}@integration.gatherup.local`,
    p_quantity: 1,
    p_form_answers: { source: "rpc-integration" },
    p_participant_note: "created by integration test"
  };
}

async function createAuthAndAppUser(admin: SupabaseClient, suffix: string, label: string): Promise<TestAuthUser> {
  const password = `GatherUp-${suffix}-${label}-12345`;
  const email = `gatherup-${suffix}-${label}@example.invalid`;
  const publicId = `GU-${label.toUpperCase()}-${suffix.slice(0, 6).toUpperCase()}`;
  const appUserId = randomUUID();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: `RPC ${label}`
    }
  });

  assert.ifError(authError);
  assert.ok(authData.user?.id, `Expected auth user for ${email}.`);

  const authUserId = authData.user.id;
  const { error: userError } = await admin.from("users").insert({
    id: appUserId,
    auth_user_id: authUserId,
    public_id: publicId,
    name: `RPC ${label}`,
    email
  });

  assert.ifError(userError);

  const { error: identityError } = await admin.from("user_auth_identities").insert({
    user_id: appUserId,
    provider: "email",
    provider_user_id: authUserId,
    email,
    display_name: `RPC ${label}`,
    is_primary: true,
    verified_at: new Date().toISOString()
  });

  assert.ifError(identityError);

  return { appUserId, authUserId, email, password, publicId };
}

async function createEvent(admin: SupabaseClient, owner: TestAuthUser, suffix: string, label: string, capacity: number) {
  const eventId = randomUUID();
  const publicCode = `GU-RPC-${label.toUpperCase()}-${suffix.slice(0, 8).toUpperCase()}`;
  const startsAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  const deadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  const { error: eventError } = await admin.from("events").insert({
    id: eventId,
    public_code: publicCode,
    organizer_id: owner.appUserId,
    name: `RPC Integration ${label}`,
    category: "community",
    template: "payment_registration",
    city: "Tokyo",
    venue_name: "Integration Test Venue",
    starts_at: startsAt,
    registration_deadline: deadline,
    capacity,
    price_cents: 100,
    visibility: "unlisted",
    allow_multi_person_registration: false,
    max_people_per_registration: 1,
    order_number_format: "event_code_sequence",
    order_number_prefix: `RPC${label.toUpperCase()}`,
    status: "registration_open"
  });

  assert.ifError(eventError);

  return eventId;
}

describe("create_registration_atomic RPC integration", { skip: !shouldRun || !requiredEnvConfigured }, () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let owner: TestAuthUser;
  let participantOne: TestAuthUser;
  let participantTwo: TestAuthUser;
  let ownerClient: SupabaseClient;
  let participantOneClient: SupabaseClient;
  let participantTwoClient: SupabaseClient;
  let normalEventId: string;
  let capacityEventId: string;
  let reviewEventId: string;
  let checkInEventId: string;
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const createdAuthUserIds: string[] = [];
  const createdAppUserIds: string[] = [];
  const createdEventIds: string[] = [];

  before(async () => {
    admin = makeAdminClient();
    anon = makeAnonClient();

    owner = await createAuthAndAppUser(admin, suffix, "owner");
    participantOne = await createAuthAndAppUser(admin, suffix, "p1");
    participantTwo = await createAuthAndAppUser(admin, suffix, "p2");
    createdAuthUserIds.push(owner.authUserId, participantOne.authUserId, participantTwo.authUserId);
    createdAppUserIds.push(owner.appUserId, participantOne.appUserId, participantTwo.appUserId);

    normalEventId = await createEvent(admin, owner, suffix, "normal", 2);
    capacityEventId = await createEvent(admin, owner, suffix, "cap", 1);
    reviewEventId = await createEvent(admin, owner, suffix, "review", 2);
    checkInEventId = await createEvent(admin, owner, suffix, "checkin", 2);
    createdEventIds.push(normalEventId, capacityEventId, reviewEventId, checkInEventId);

    ownerClient = await makeSignedInClient(owner.email, owner.password);
    participantOneClient = await makeSignedInClient(participantOne.email, participantOne.password);
    participantTwoClient = await makeSignedInClient(participantTwo.email, participantTwo.password);
  });

  after(async () => {
    if (!admin) return;

    if (createdEventIds.length > 0) {
      await admin.from("events").delete().in("id", createdEventIds);
    }

    if (createdAppUserIds.length > 0) {
      await admin.from("users").delete().in("id", createdAppUserIds);
    }

    await Promise.all(createdAuthUserIds.map((userId) => admin.auth.admin.deleteUser(userId)));
  });

  it("rejects unauthenticated calls", async () => {
    const { data, error } = await anon.rpc("create_registration_atomic", rpcPayload(normalEventId, "anon-user"));

    assert.ok(error || data?.success === false);
    if (data?.success === false) {
      assert.equal(data.error_code, "UNAUTHORIZED");
    }
  });

  it("creates an order with the event-scoped number format", async () => {
    const { data, error } = await participantOneClient.rpc(
      "create_registration_atomic",
      rpcPayload(normalEventId, "participant-one")
    );

    assert.ifError(error);
    assert.equal(data?.success, true);
    assert.match(data.order_number, /^RPCNORMAL-\d{4}$/);
    assert.equal(data.status, "awaiting_payment");
    assert.equal(data.payment_status, "unpaid");
    assert.equal(data.amount_due_cents, 100);
  });

  it("rejects duplicate active registrations for the same user and event", async () => {
    const { data, error } = await participantOneClient.rpc(
      "create_registration_atomic",
      rpcPayload(normalEventId, "participant-one-again")
    );

    assert.ifError(error);
    assert.equal(data?.success, false);
    assert.equal(data.error_code, "ALREADY_REGISTERED");
  });

  it("prevents oversell when two users compete for the last capacity slot", async () => {
    const results = await Promise.all([
      participantOneClient.rpc("create_registration_atomic", rpcPayload(capacityEventId, "capacity-one")),
      participantTwoClient.rpc("create_registration_atomic", rpcPayload(capacityEventId, "capacity-two"))
    ]);
    const successCount = results.filter(({ data, error }) => !error && data?.success === true).length;
    const capacityRejectionCount = results.filter(({ data }) => data?.success === false && data.error_code === "CAPACITY_EXCEEDED").length;

    assert.equal(successCount, 1);
    assert.equal(capacityRejectionCount, 1);
  });

  it("reviews a submitted payment through the audited payment RPC", async () => {
    const createResult = await participantTwoClient.rpc(
      "create_registration_atomic",
      rpcPayload(reviewEventId, "payment-review-user")
    );

    assert.ifError(createResult.error);
    assert.equal(createResult.data?.success, true);

    const registrationId = createResult.data.registration_id as string;
    const orderNumber = createResult.data.order_number as string;
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("id, amount_cents, status")
      .eq("registration_id", registrationId)
      .single();

    assert.ifError(paymentError);
    assert.ok(payment?.id);
    assert.equal(payment.status, "unpaid");

    const { error: proofError } = await admin.from("payment_proofs").insert({
      payment_id: payment.id,
      registration_id: registrationId,
      file_url: `${reviewEventId}/${registrationId}/${payment.id}/integration-proof.png`,
      amount_reported_cents: payment.amount_cents,
      uploaded_by: participantTwo.appUserId
    });

    assert.ifError(proofError);

    const { data: submittedOrder, error: submittedOrderError } = await admin
      .from("registrations")
      .select("status")
      .eq("id", registrationId)
      .single();

    assert.ifError(submittedOrderError);
    assert.equal(submittedOrder?.status, "payment_submitted");

    const { data, error } = await ownerClient.rpc("review_payment_atomic", {
      p_registration_id: registrationId,
      p_order_number: null,
      p_decision: "APPROVED",
      p_review_note: "approved by integration test"
    });

    assert.ifError(error);
    assert.equal(data?.success, true);
    assert.equal(data.order_number, orderNumber);
    assert.equal(data.status, "confirmed");
    assert.equal(data.payment_status, "confirmed");

    const { data: reviewedPayment, error: reviewedPaymentError } = await admin
      .from("payments")
      .select("status, amount_confirmed_cents, reviewed_by")
      .eq("id", payment.id)
      .single();

    assert.ifError(reviewedPaymentError);
    assert.equal(reviewedPayment?.status, "confirmed");
    assert.equal(reviewedPayment?.amount_confirmed_cents, payment.amount_cents);
    assert.equal(reviewedPayment?.reviewed_by, owner.appUserId);
  });

  it("checks in a confirmed order through the audited check-in RPC", async () => {
    const createResult = await participantOneClient.rpc(
      "create_registration_atomic",
      rpcPayload(checkInEventId, "check-in-user")
    );

    assert.ifError(createResult.error);
    assert.equal(createResult.data?.success, true);

    const registrationId = createResult.data.registration_id as string;
    const orderNumber = createResult.data.order_number as string;
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
      file_url: `${checkInEventId}/${registrationId}/${payment.id}/check-in-proof.png`,
      amount_reported_cents: payment.amount_cents,
      uploaded_by: participantOne.appUserId
    });

    assert.ifError(proofError);

    const reviewResult = await ownerClient.rpc("review_payment_atomic", {
      p_registration_id: registrationId,
      p_order_number: null,
      p_decision: "APPROVED",
      p_review_note: "approved before check-in integration test"
    });

    assert.ifError(reviewResult.error);
    assert.equal(reviewResult.data?.success, true);

    const { data: order, error: orderError } = await admin
      .from("registrations")
      .select("status, check_in_code, check_in_status")
      .eq("id", registrationId)
      .single();

    assert.ifError(orderError);
    assert.equal(order?.status, "confirmed");
    assert.equal(order?.check_in_status, "not_arrived");
    assert.ok(order?.check_in_code);

    const checkInResult = await ownerClient.rpc("check_in_order_atomic", {
      p_check_in_code: order.check_in_code,
      p_note: "checked in by integration test"
    });

    assert.ifError(checkInResult.error);
    assert.equal(checkInResult.data?.success, true);
    assert.equal(checkInResult.data.order_number, orderNumber);
    assert.equal(checkInResult.data.check_in_status, "arrived");
    assert.equal(checkInResult.data.attendee_count, 1);

    const { data: checkedOrder, error: checkedOrderError } = await admin
      .from("registrations")
      .select("check_in_status")
      .eq("id", registrationId)
      .single();

    assert.ifError(checkedOrderError);
    assert.equal(checkedOrder?.check_in_status, "arrived");

    const { count: checkInCount, error: checkInCountError } = await admin
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("registration_id", registrationId);

    assert.ifError(checkInCountError);
    assert.equal(checkInCount, 1);

    const duplicateResult = await ownerClient.rpc("check_in_order_atomic", {
      p_check_in_code: order.check_in_code,
      p_note: "duplicate check-in should fail"
    });

    assert.ifError(duplicateResult.error);
    assert.equal(duplicateResult.data?.success, false);
    assert.equal(duplicateResult.data.error_code, "ALREADY_CHECKED_IN");
  });
});
