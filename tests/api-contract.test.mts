import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readSource(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function expectSource(source: string, needle: string) {
  assert.ok(source.includes(needle), `Expected source to include: ${needle}`);
}

describe("registration and payment proof API contracts", () => {
  const orderRoute = readSource("src/app/api/orders/route.ts");
  const paymentProofRoute = readSource("src/app/api/orders/payment-proof/route.ts");
  const paymentReviewRoute = readSource("src/app/api/orders/review/route.ts");
  const orderVerifyRoute = readSource("src/app/api/orders/verify/route.ts");
  const seatLockRoute = readSource("src/app/api/seats/lock/route.ts");
  const seatConfirmRoute = readSource("src/app/api/seats/confirm/route.ts");
  const orderSeatSelectionPanel = readSource("src/components/order-seat-selection-panel.tsx");
  const orderPage = readSource("src/app/me/orders/[orderNumber]/page.tsx");
  const registrationFlow = readSource("src/components/registration-flow.tsx");

  it("keeps order creation on the user JWT atomic registration RPC path", () => {
    expectSource(orderRoute, "readBearerToken(request)");
    expectSource(orderRoute, "verifySupabaseAccessToken(accessToken)");
    expectSource(orderRoute, "getSupabaseUserClient(accessToken)");
    expectSource(orderRoute, 'userClient.rpc("create_registration_atomic"');
    expectSource(orderRoute, 'payment_id: payment?.id ?? null');

    assert.doesNotMatch(orderRoute, /payment_screenshot_img:\s*paymentScreenshotImg/);
    assert.doesNotMatch(orderRoute, /from\("payment_proofs"\)\.insert/);
  });

  it("keeps participant payment proof submission gated by identity and order ownership", () => {
    expectSource(paymentProofRoute, "readBearerToken(request)");
    expectSource(paymentProofRoute, "verifySupabaseAccessToken(accessToken)");
    expectSource(paymentProofRoute, "findUserByAuthUserId(supabase, authUser.id)");
    expectSource(paymentProofRoute, "registration.user_id !== appUser.id");
    expectSource(paymentProofRoute, '.eq("registration_id", registration.id)');
    expectSource(paymentProofRoute, 'from("payment_proofs").insert');
  });

  it("keeps organizer payment review on the user JWT RPC path", () => {
    expectSource(paymentReviewRoute, "readBearerToken(request)");
    expectSource(paymentReviewRoute, "verifySupabaseAccessToken(accessToken)");
    expectSource(paymentReviewRoute, "getSupabaseUserClient(accessToken)");
    expectSource(paymentReviewRoute, 'supabase.rpc("review_payment_atomic"');
    expectSource(paymentReviewRoute, "p_registration_id: isUuid(orderId) ? orderId : null");
    expectSource(paymentReviewRoute, "p_order_number: isUuid(orderId) ? null : orderId");

    assert.doesNotMatch(paymentReviewRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(paymentReviewRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(paymentReviewRoute, /\.from\("payments"\)\s*\n\s*\.update/);
    assert.doesNotMatch(paymentReviewRoute, /\.from\("payment_proofs"\)\s*\n\s*\.update/);
  });

  it("keeps order check-in on the user JWT RPC path", () => {
    expectSource(orderVerifyRoute, "readBearerToken(request)");
    expectSource(orderVerifyRoute, "verifySupabaseAccessToken(accessToken)");
    expectSource(orderVerifyRoute, "getSupabaseUserClient(accessToken)");
    expectSource(orderVerifyRoute, 'supabase.rpc("check_in_order_atomic"');
    expectSource(orderVerifyRoute, "p_check_in_code: checkInCode");

    assert.doesNotMatch(orderVerifyRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderVerifyRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderVerifyRoute, /\.from\("registration_attendees"\)\s*\n\s*\.update/);
  });

  it("keeps payment proof files bound to the private Storage object path", () => {
    expectSource(paymentProofRoute, 'replace(/^payment-proofs\\//, "")');
    expectSource(paymentProofRoute, "pathMatchesProof(storagePath, registration.event_id, registration.id, payment.id)");
    expectSource(paymentProofRoute, '.schema("storage")');
    expectSource(paymentProofRoute, '.from("objects")');
    expectSource(paymentProofRoute, '.eq("bucket_id", "payment-proofs")');
    expectSource(paymentProofRoute, '.eq("name", storagePath)');
    expectSource(paymentProofRoute, "找不到已上传的付款截图文件");
  });

  it("keeps the browser upload aligned with the Storage RLS path contract", () => {
    expectSource(registrationFlow, '.from("payment-proofs")');
    expectSource(registrationFlow, ".upload(storagePath, file");
    expectSource(registrationFlow, "`${proofEventId}/${registrationId}/${paymentId}/${Date.now()}-${getSafeFileName(file.name)}`");
    expectSource(registrationFlow, 'fetch("/api/orders/payment-proof"');
    expectSource(registrationFlow, "Authorization: `Bearer ${accessToken}`");
  });

  it("keeps seat locking and confirmation on user JWT RPC paths", () => {
    expectSource(seatLockRoute, "readBearerToken(request)");
    expectSource(seatLockRoute, "verifySupabaseAccessToken(accessToken)");
    expectSource(seatLockRoute, "getSupabaseUserClient(accessToken)");
    expectSource(seatLockRoute, 'supabase.rpc("create_seat_lock_atomic"');
    expectSource(seatLockRoute, "p_registration_id: registrationId");
    expectSource(seatLockRoute, "p_seat_id: seatId");

    expectSource(seatConfirmRoute, "readBearerToken(request)");
    expectSource(seatConfirmRoute, "verifySupabaseAccessToken(accessToken)");
    expectSource(seatConfirmRoute, "getSupabaseUserClient(accessToken)");
    expectSource(seatConfirmRoute, 'supabase.rpc("confirm_seat_assignment_atomic"');
    expectSource(seatConfirmRoute, "p_seat_lock_id: seatLockId");
    expectSource(seatConfirmRoute, "p_attendee_id: attendeeId");

    assert.doesNotMatch(seatLockRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(seatConfirmRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(seatLockRoute, /\.from\("seat_locks"\)\s*\n\s*\.insert/);
    assert.doesNotMatch(seatConfirmRoute, /\.from\("seat_assignments"\)\s*\n\s*\.insert/);
  });

  it("keeps real seat selection wired through the order detail panel", () => {
    expectSource(orderPage, "OrderSeatSelectionPanel");
    expectSource(orderPage, "orderDetail.seatSelection");
    expectSource(orderSeatSelectionPanel, 'fetch("/api/seats/lock"');
    expectSource(orderSeatSelectionPanel, 'fetch("/api/seats/confirm"');
    expectSource(orderSeatSelectionPanel, "Authorization: `Bearer ${accessToken}`");
    expectSource(orderSeatSelectionPanel, "registration_id: registrationId");
    expectSource(orderSeatSelectionPanel, "seat_id: selectedSeatId");
    expectSource(orderSeatSelectionPanel, "seat_lock_id: lockResult.seat_lock_id");
    expectSource(orderSeatSelectionPanel, "attendee_id: selectedAttendeeId");
    expectSource(orderSeatSelectionPanel, "setLocalAttendees");
    expectSource(orderSeatSelectionPanel, "setLocalSeats");
    expectSource(orderSeatSelectionPanel, 'status: "assigned"');
  });
});
