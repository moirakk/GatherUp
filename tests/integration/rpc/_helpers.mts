import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
const envFile = join(repoRoot, ".env.local");

export function loadRpcIntegrationEnv() {
  if (!existsSync(envFile)) {
    return;
  }

  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

loadRpcIntegrationEnv();

export const rpcIntegrationRequested = process.env.GATHERUP_RUN_RPC_INTEGRATION === "1";
export const cleanProjectConfirmed = process.env.GATHERUP_RPC_INTEGRATION_TARGET === "clean-dev";
export const shouldRunRpcIntegration = rpcIntegrationRequested && cleanProjectConfirmed;
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const requiredEnvConfigured = Boolean(supabaseUrl && anonKey && serviceRoleKey);

if (rpcIntegrationRequested && !cleanProjectConfirmed) {
  console.warn(
    "GATHERUP_RUN_RPC_INTEGRATION=1 was set, but RPC integration tests are skipped until " +
      "GATHERUP_RPC_INTEGRATION_TARGET=clean-dev confirms the target is a disposable dev/staging project."
  );
}

export type TestAuthUser = {
  appUserId: string;
  authUserId: string;
  email: string;
  password: string;
  publicId: string;
};

export function makeAdminClient(): SupabaseClient {
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

export function makeAnonClient(): SupabaseClient {
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

export async function makeSignedInClient(email: string, password: string): Promise<SupabaseClient> {
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

export function rpcPayload(eventId: string, nickname: string) {
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

export async function createAuthAndAppUser(admin: SupabaseClient, suffix: string, label: string): Promise<TestAuthUser> {
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

type CreateEventOverrides = {
  status?: string;
  seatSelectionMode?: "none" | "after_payment_confirmation" | "scheduled" | "manual";
  seatLockMinutes?: number;
};

export async function createEvent(
  admin: SupabaseClient,
  owner: TestAuthUser,
  suffix: string,
  label: string,
  capacity: number,
  overrides: CreateEventOverrides = {}
): Promise<string> {
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
    status: overrides.status ?? "registration_open",
    seat_selection_mode: overrides.seatSelectionMode ?? "none",
    seat_lock_minutes: overrides.seatLockMinutes ?? 5
  });

  assert.ifError(eventError);

  return eventId;
}

export async function addEventOrganizer(
  admin: SupabaseClient,
  eventId: string,
  userId: string,
  role: "owner" | "cohost" | "finance" | "staff" | "viewer",
  permissions: Record<string, unknown> = {}
) {
  const { error } = await admin.from("event_organizers").insert({
    event_id: eventId,
    user_id: userId,
    role,
    permissions
  });

  assert.ifError(error);
}

/**
 * Creates a registration through the real RPC, then drives it to `confirmed`
 * the same way the existing payment-review test does: admin inserts the
 * payment_proofs row (simulating the Storage-backed upload step), then the
 * event owner approves it through review_payment_atomic.
 *
 * Returns the IDs that downstream tests (seat locks, refunds, Storage path
 * checks) need.
 */
export async function createConfirmedRegistration(
  participantClient: SupabaseClient,
  admin: SupabaseClient,
  ownerClient: SupabaseClient,
  eventId: string,
  uploaderAppUserId: string,
  nickname: string
) {
  const createResult = await participantClient.rpc("create_registration_atomic", rpcPayload(eventId, nickname));

  assert.ifError(createResult.error);
  assert.equal(createResult.data?.success, true, `Expected registration to succeed for ${nickname}.`);

  const registrationId = createResult.data.registration_id as string;
  const orderNumber = createResult.data.order_number as string;

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, amount_cents")
    .eq("registration_id", registrationId)
    .single();

  assert.ifError(paymentError);
  assert.ok(payment?.id);

  const proofPath = `${eventId}/${registrationId}/${payment.id}/${nickname}-setup-proof.png`;
  const { error: proofError } = await admin.from("payment_proofs").insert({
    payment_id: payment.id,
    registration_id: registrationId,
    file_url: proofPath,
    amount_reported_cents: payment.amount_cents,
    uploaded_by: uploaderAppUserId
  });

  assert.ifError(proofError);

  const reviewResult = await ownerClient.rpc("review_payment_atomic", {
    p_registration_id: registrationId,
    p_order_number: null,
    p_decision: "APPROVED",
    p_review_note: "approved by integration test setup"
  });

  assert.ifError(reviewResult.error);
  assert.equal(reviewResult.data?.success, true, `Expected payment review to succeed for ${nickname}.`);

  return { registrationId, orderNumber, paymentId: payment.id as string, amountCents: payment.amount_cents as number };
}

export async function cleanupRpcIntegrationData(
  admin: SupabaseClient | undefined,
  ids: { eventIds: string[]; appUserIds: string[]; authUserIds: string[] }
) {
  if (!admin) return;

  if (ids.eventIds.length > 0) {
    await admin.from("events").delete().in("id", ids.eventIds);
  }

  if (ids.appUserIds.length > 0) {
    await admin.from("users").delete().in("id", ids.appUserIds);
  }

  await Promise.all(ids.authUserIds.map((userId) => admin.auth.admin.deleteUser(userId)));
}
