import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readSource(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function expectSource(source: string, needle: string) {
  assert.ok(source.includes(needle), `Expected source to include: ${needle}`);
}

function listApiRouteFiles(dir = join(repoRoot, "src/app/api")): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        return listApiRouteFiles(path);
      }

      return entry === "route.ts" ? [path] : [];
    })
    .sort();
}

describe("registration and payment proof API contracts", () => {
  const eventRoute = readSource("src/app/api/events/route.ts");
  const orderRoute = readSource("src/app/api/orders/route.ts");
  const paymentProofRoute = readSource("src/app/api/orders/payment-proof/route.ts");
  const paymentReviewRoute = readSource("src/app/api/orders/review/route.ts");
  const orderRefundRoute = readSource("src/app/api/orders/refund/route.ts");
  const orderRefundReviewRoute = readSource("src/app/api/orders/refund/review/route.ts");
  const orderRefundProofRoute = readSource("src/app/api/orders/refund/proof/route.ts");
  const orderVerifyRoute = readSource("src/app/api/orders/verify/route.ts");
  const exportAttendeesRoute = readSource("src/app/api/export/attendees/route.ts");
  const exportFinanceRoute = readSource("src/app/api/export/finance/route.ts");
  const devStatusRoute = readSource("src/app/api/dev/status/route.ts");
  const seatLockRoute = readSource("src/app/api/seats/lock/route.ts");
  const seatConfirmRoute = readSource("src/app/api/seats/confirm/route.ts");
  const waitlistRoute = readSource("src/app/api/waitlist/route.ts");
  const waitlistInviteRoute = readSource("src/app/api/waitlist/invite/route.ts");
  const notificationRoute = readSource("src/app/api/notifications/route.ts");
  const appShell = readSource("src/components/app-shell.tsx");
  const notificationBell = readSource("src/components/notification-bell.tsx");
  const orderSeatSelectionPanel = readSource("src/components/order-seat-selection-panel.tsx");
  const orderPage = readSource("src/app/me/orders/[orderNumber]/page.tsx");
  const devStatusPage = readSource("src/app/dev/status/page.tsx");
  const registrationFlow = readSource("src/components/registration-flow.tsx");
  const serverApi = readSource("src/lib/server/api.ts");
  const supabaseServer = readSource("src/lib/supabase/server.ts");

  it("keeps route authentication unified across Bearer and Supabase SSR cookie sessions", () => {
    expectSource(supabaseServer, "export async function getAuthenticatedUser(request: Request)");
    expectSource(supabaseServer, "export async function getAuthenticatedSupabaseClient(request: Request)");
    expectSource(supabaseServer, "verifySupabaseAccessToken(accessToken)");
    expectSource(supabaseServer, "getSupabaseUserClient(accessToken)");
    expectSource(supabaseServer, "createSupabaseServerClient()");
    expectSource(supabaseServer, "supabase.auth.getUser()");
  });

  it("requires every mutating API route to enforce rate limiting", () => {
    const mutatingRoutePattern = /export async function (POST|PATCH|PUT|DELETE)\s*\(/;
    const mutatingRoutes = listApiRouteFiles()
      .map((file) => ({ file: relative(repoRoot, file), source: readFileSync(file, "utf8") }))
      .filter(({ source }) => mutatingRoutePattern.test(source));

    assert.ok(mutatingRoutes.length > 0, "Expected at least one mutating API route.");

    for (const { file, source } of mutatingRoutes) {
      assert.ok(source.includes("enforceRateLimit(request"), `${file} must call enforceRateLimit(request) before mutating work.`);
      assert.ok(source.includes('from "@/lib/server/rate-limit"'), `${file} must import the shared server rate limiter.`);
    }
  });

  it("keeps order creation on the authenticated Supabase atomic registration RPC path", () => {
    expectSource(orderRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderRoute, "enforceRateLimit(request");
    expectSource(orderRoute, 'keyPrefix: "orders:create"');
    expectSource(orderRoute, 'authContext.supabase.rpc("create_registration_atomic"');
    expectSource(orderRoute, 'payment_id: payment?.id ?? null');

    assert.doesNotMatch(orderRoute, /payment_screenshot_img:\s*paymentScreenshotImg/);
    assert.doesNotMatch(orderRoute, /from\("payment_proofs"\)\.insert/);
  });

  it("keeps event creation protected by authentication and rate limiting", () => {
    expectSource(eventRoute, "getAuthenticatedUser(request)");
    expectSource(eventRoute, "enforceRateLimit(request");
    expectSource(eventRoute, 'keyPrefix: "events:create"');
    expectSource(eventRoute, '.from("events")');
    expectSource(eventRoute, '.insert({');
  });

  it("keeps participant payment proof submission gated by identity and order ownership", () => {
    expectSource(paymentProofRoute, "getAuthenticatedUser(request)");
    expectSource(paymentProofRoute, "enforceRateLimit(request");
    expectSource(paymentProofRoute, 'keyPrefix: "orders:payment-proof"');
    expectSource(paymentProofRoute, "findUserByAuthUserId(supabase, authUser.id)");
    expectSource(paymentProofRoute, "registration.user_id !== appUser.id");
    expectSource(paymentProofRoute, '.eq("registration_id", registration.id)');
    expectSource(paymentProofRoute, 'from("payment_proofs").insert');
  });

  it("keeps organizer payment review on the authenticated Supabase RPC path", () => {
    expectSource(paymentReviewRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(paymentReviewRoute, "enforceRateLimit(request");
    expectSource(paymentReviewRoute, 'keyPrefix: "orders:review"');
    expectSource(paymentReviewRoute, 'authContext.supabase.rpc("review_payment_atomic"');
    expectSource(paymentReviewRoute, "p_registration_id: isUuid(orderId) ? orderId : null");
    expectSource(paymentReviewRoute, "p_order_number: isUuid(orderId) ? null : orderId");

    assert.doesNotMatch(paymentReviewRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(paymentReviewRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(paymentReviewRoute, /\.from\("payments"\)\s*\n\s*\.update/);
    assert.doesNotMatch(paymentReviewRoute, /\.from\("payment_proofs"\)\s*\n\s*\.update/);
  });

  it("keeps order check-in on the authenticated Supabase RPC path", () => {
    expectSource(orderVerifyRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderVerifyRoute, "enforceRateLimit(request");
    expectSource(orderVerifyRoute, 'keyPrefix: "orders:verify"');
    expectSource(orderVerifyRoute, 'authContext.supabase.rpc("check_in_order_atomic"');
    expectSource(orderVerifyRoute, "p_check_in_code: checkInCode");

    assert.doesNotMatch(orderVerifyRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderVerifyRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderVerifyRoute, /\.from\("registration_attendees"\)\s*\n\s*\.update/);
  });

  it("keeps export authorization on the database permission helper", () => {
    expectSource(serverApi, "export async function canManageEvent(supabase: SupabaseClient, eventId: string)");
    expectSource(serverApi, 'supabase.rpc("can_manage_event"');
    expectSource(serverApi, "target_event_id: eventId");
    assert.doesNotMatch(serverApi, /export async function canManageEvent[\s\S]*?\.from\("event_organizers"\)/);

    for (const route of [exportAttendeesRoute, exportFinanceRoute]) {
      expectSource(route, "getAuthenticatedSupabaseClient(request)");
      expectSource(route, "getSupabaseServiceClient()");
      expectSource(route, "canManageEvent(authContext.supabase, event.id)");
      assert.doesNotMatch(route, /canManageEventByAuthUserId/);
    }
  });

  it("keeps dev status checks authenticated and read-only", () => {
    expectSource(devStatusRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(devStatusRoute, "getSupabaseServiceClient()");
    expectSource(devStatusRoute, 'select("id", { head: true, count: "exact" })');
    expectSource(devStatusRoute, "SUPABASE_SERVICE_ROLE_KEY");
    expectSource(devStatusPage, 'fetch("/api/dev/status"');
    expectSource(devStatusPage, "ServerHealthResponse");
    expectSource(devStatusPage, "服务端 Supabase Health");

    assert.doesNotMatch(devStatusRoute, /SUPABASE_SERVICE_ROLE_KEY[^\\n]*:/);
    assert.doesNotMatch(devStatusRoute, /\.insert\(/);
    assert.doesNotMatch(devStatusRoute, /\.update\(/);
    assert.doesNotMatch(devStatusRoute, /\.delete\(/);
  });

  it("keeps participant refund requests on the authenticated Supabase RPC path", () => {
    expectSource(orderRefundRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderRefundRoute, "enforceRateLimit(request");
    expectSource(orderRefundRoute, 'keyPrefix: "orders:refund"');
    expectSource(orderRefundRoute, 'authContext.supabase.rpc("request_refund_atomic"');
    expectSource(orderRefundRoute, "p_registration_id: registrationId");
    expectSource(orderRefundRoute, "p_reason: reason");

    assert.doesNotMatch(orderRefundRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderRefundRoute, /\.from\("refund_requests"\)\s*\n\s*\.insert/);
    assert.doesNotMatch(orderRefundRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundRoute, /\.from\("payments"\)\s*\n\s*\.update/);
  });

  it("keeps organizer refund review on the authenticated Supabase RPC path", () => {
    expectSource(orderRefundReviewRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderRefundReviewRoute, "enforceRateLimit(request");
    expectSource(orderRefundReviewRoute, 'keyPrefix: "orders:refund-review"');
    expectSource(orderRefundReviewRoute, 'authContext.supabase.rpc("review_refund_request_atomic"');
    expectSource(orderRefundReviewRoute, "p_refund_request_id: refundRequestId");
    expectSource(orderRefundReviewRoute, "p_decision: decision");

    assert.doesNotMatch(orderRefundReviewRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderRefundReviewRoute, /\.from\("refund_requests"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundReviewRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundReviewRoute, /\.from\("payments"\)\s*\n\s*\.update/);
  });

  it("keeps organizer refund proof upload bound to the private Storage path and RPC", () => {
    expectSource(orderRefundProofRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderRefundProofRoute, "enforceRateLimit(request");
    expectSource(orderRefundProofRoute, 'keyPrefix: "orders:refund-proof"');
    expectSource(orderRefundProofRoute, 'replace(/^refund-proofs\\//, "")');
    expectSource(orderRefundProofRoute, "pathMatchesRefundProof(storagePath, eventId, refundRequest.id)");
    expectSource(orderRefundProofRoute, '.schema("storage")');
    expectSource(orderRefundProofRoute, '.from("objects")');
    expectSource(orderRefundProofRoute, '.eq("bucket_id", "refund-proofs")');
    expectSource(orderRefundProofRoute, '.eq("name", storagePath)');
    expectSource(orderRefundProofRoute, 'authContext.supabase.rpc("record_refund_proof_atomic"');
    expectSource(orderRefundProofRoute, "p_refund_request_id: refundRequestId");
    expectSource(orderRefundProofRoute, "p_file_url: storagePath");

    assert.doesNotMatch(orderRefundProofRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderRefundProofRoute, /\.from\("refund_proofs"\)\s*\n\s*\.insert/);
    assert.doesNotMatch(orderRefundProofRoute, /\.from\("refund_requests"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundProofRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundProofRoute, /\.from\("payments"\)\s*\n\s*\.update/);
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

  it("keeps seat locking and confirmation on authenticated Supabase RPC paths", () => {
    expectSource(seatLockRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(seatLockRoute, "enforceRateLimit(request");
    expectSource(seatLockRoute, 'keyPrefix: "seats:lock"');
    expectSource(seatLockRoute, 'authContext.supabase.rpc("create_seat_lock_atomic"');
    expectSource(seatLockRoute, "p_registration_id: registrationId");
    expectSource(seatLockRoute, "p_seat_id: seatId");

    expectSource(seatConfirmRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(seatConfirmRoute, "enforceRateLimit(request");
    expectSource(seatConfirmRoute, 'keyPrefix: "seats:confirm"');
    expectSource(seatConfirmRoute, 'authContext.supabase.rpc("confirm_seat_assignment_atomic"');
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

  it("keeps waitlist actions on authenticated Supabase RPC paths", () => {
    expectSource(waitlistRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(waitlistRoute, "enforceRateLimit(request");
    expectSource(waitlistRoute, 'keyPrefix: "waitlist:join"');
    expectSource(waitlistRoute, 'authContext.supabase.rpc("join_waitlist_atomic"');
    expectSource(waitlistRoute, "p_event_id: eventId");
    expectSource(waitlistRoute, "p_desired_quantity:");
    expectSource(waitlistRoute, "CAPACITY_AVAILABLE");

    expectSource(waitlistInviteRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(waitlistInviteRoute, "enforceRateLimit(request");
    expectSource(waitlistInviteRoute, 'keyPrefix: "waitlist:invite"');
    expectSource(waitlistInviteRoute, 'authContext.supabase.rpc("invite_waitlist_entry_atomic"');
    expectSource(waitlistInviteRoute, "p_waitlist_entry_id: waitlistEntryId");
    expectSource(waitlistInviteRoute, "INVALID_WAITLIST_STATUS");

    assert.doesNotMatch(waitlistRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(waitlistInviteRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(waitlistRoute, /\.from\("waitlist_entries"\)\s*\n\s*\.insert/);
    assert.doesNotMatch(waitlistInviteRoute, /\.from\("waitlist_entries"\)\s*\n\s*\.update/);
  });

  it("keeps in-app notifications on authenticated RLS reads and read-state RPC updates", () => {
    expectSource(notificationRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(notificationRoute, "enforceRateLimit(request");
    expectSource(notificationRoute, 'keyPrefix: "notifications:read"');
    expectSource(notificationRoute, "findUserByAuthUserId(authContext.supabase, authContext.user.id)");
    expectSource(notificationRoute, '.from("notification_deliveries")');
    expectSource(notificationRoute, '.eq("recipient_id", appUser.id)');
    expectSource(notificationRoute, '.eq("channel", "in_app")');
    expectSource(notificationRoute, '.is("read_at", null)');
    expectSource(notificationRoute, 'authContext.supabase.rpc("mark_notification_deliveries_read"');
    expectSource(notificationRoute, "p_mark_all: markAll");

    assert.doesNotMatch(notificationRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(notificationRoute, /\.from\("notification_deliveries"\)\s*\n\s*\.update/);
  });

  it("keeps the notification bell wired through the shared app shell", () => {
    expectSource(appShell, "NotificationBell");
    expectSource(appShell, 'enabled={session.sessionType === "supabase"}');
    expectSource(notificationBell, 'fetch("/api/notifications?limit=10"');
    expectSource(notificationBell, 'fetch("/api/notifications"');
    expectSource(notificationBell, "Authorization: `Bearer ${accessToken}`");
    expectSource(notificationBell, "setUnreadCount(result.unread_count ?? 0)");
    expectSource(notificationBell, "setNotifications(result.notifications ?? [])");
    expectSource(notificationBell, "JSON.stringify({ all: true })");

    assert.doesNotMatch(notificationBell, /\.from\("notification_deliveries"\)/);
  });
});
