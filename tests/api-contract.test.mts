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
  const eventOrganizerRoute = readSource("src/app/api/events/organizers/route.ts");
  const eventPublishRoute = readSource("src/app/api/events/publish/route.ts");
  const eventUpdateRoute = readSource("src/app/api/events/update/route.ts");
  const orderRoute = readSource("src/app/api/orders/route.ts");
  const paymentProofRoute = readSource("src/app/api/orders/payment-proof/route.ts");
  const paymentReviewRoute = readSource("src/app/api/orders/review/route.ts");
  const orderRefundRoute = readSource("src/app/api/orders/refund/route.ts");
  const orderRefundReviewRoute = readSource("src/app/api/orders/refund/review/route.ts");
  const orderRefundProofRoute = readSource("src/app/api/orders/refund/proof/route.ts");
  const expenseProofRoute = readSource("src/app/api/expenses/proof/route.ts");
  const orderVerifyRoute = readSource("src/app/api/orders/verify/route.ts");
  const exportAttendeesRoute = readSource("src/app/api/export/attendees/route.ts");
  const exportFinanceRoute = readSource("src/app/api/export/finance/route.ts");
  const devStatusRoute = readSource("src/app/api/dev/status/route.ts");
  const seatLockRoute = readSource("src/app/api/seats/lock/route.ts");
  const seatConfirmRoute = readSource("src/app/api/seats/confirm/route.ts");
  const waitlistRoute = readSource("src/app/api/waitlist/route.ts");
  const waitlistInviteRoute = readSource("src/app/api/waitlist/invite/route.ts");
  const announcementPublishRoute = readSource("src/app/api/announcements/route.ts");
  const expenseRoute = readSource("src/app/api/expenses/route.ts");
  const notificationRoute = readSource("src/app/api/notifications/route.ts");
  const adminEventReviewRoute = readSource("src/app/api/admin/event-reviews/route.ts");
  const adminOrganizerVerificationRoute = readSource("src/app/api/admin/organizer-verifications/route.ts");
  const adminPage = readSource("src/app/admin/page.tsx");
  const adminEventReviewPanel = readSource("src/components/admin-event-review-panel.tsx");
  const adminVerificationReviewPanel = readSource("src/components/admin-verification-review-panel.tsx");
  const serverAdmin = readSource("src/lib/server/admin.ts");
  const organizerVerificationRoute = readSource("src/app/api/organizer/verification/route.ts");
  const appShell = readSource("src/components/app-shell.tsx");
  const notificationBell = readSource("src/components/notification-bell.tsx");
  const orderSeatSelectionPanel = readSource("src/components/order-seat-selection-panel.tsx");
  const orderPage = readSource("src/app/me/orders/[orderNumber]/page.tsx");
  const myOrdersPage = readSource("src/app/me/page.tsx");
  const organizerPage = readSource("src/app/organizer/page.tsx");
  const organizerEventPage = readSource("src/app/organizer/events/[eventId]/page.tsx");
  const organizerFinancePage = readSource("src/app/organizer/events/[eventId]/finance/page.tsx");
  const organizerNewEventPage = readSource("src/app/organizer/events/new/page.tsx");
  const organizerEventActions = readSource("src/components/organizer-event-actions.tsx");
  const organizerVerificationPanel = readSource("src/components/organizer-verification-panel.tsx");
  const eventIdentityPanel = readSource("src/components/event-identity-panel.tsx");
  const eventBasicsEditor = readSource("src/components/event-basics-editor.tsx");
  const registerPage = readSource("src/app/events/[eventId]/register/page.tsx");
  const devStatusPage = readSource("src/app/dev/status/page.tsx");
  const registrationFlow = readSource("src/components/registration-flow.tsx");
  const announcementCenter = readSource("src/components/announcement-center.tsx");
  const auditLogTimeline = readSource("src/components/audit-log-timeline.tsx");
  const expenseLedger = readSource("src/components/expense-ledger.tsx");
  const expenseProofList = readSource("src/components/expense-proof-list.tsx");
  const eventsData = readSource("src/lib/events-data.ts");
  const organizerData = readSource("src/lib/organizer-data.ts");
  const ordersData = readSource("src/lib/orders-data.ts");
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

  it("requires every API route to authenticate inside its route handler", () => {
    const apiRoutes = listApiRouteFiles().map((file) => ({
      file: relative(repoRoot, file),
      source: readFileSync(file, "utf8")
    }));

    assert.ok(apiRoutes.length > 0, "Expected at least one API route.");

    for (const { file, source } of apiRoutes) {
      assert.match(
        source,
        /getAuthenticated(User|SupabaseClient)\(request\)|requirePlatformAdmin\(request\)/,
        `${file} must authenticate the request or require a platform admin because middleware intentionally lets /api routes reach their handlers.`
      );
      assert.ok(
        source.includes('from "@/lib/supabase/server"') || source.includes('from "@/lib/server/admin"'),
        `${file} must use shared Supabase auth helpers instead of local cookie/session parsing.`
      );
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

  it("keeps the organizer event creation wizard on the real Supabase create path", () => {
    expectSource(organizerNewEventPage, 'fetch("/api/events"');
    expectSource(organizerNewEventPage, "getSupabaseBrowserClient().auth.getSession()");
    expectSource(organizerNewEventPage, "router.push(`/organizer/events/${result.event_id}`)");
    expectSource(organizerNewEventPage, "本地演示模式");
    assert.doesNotMatch(organizerNewEventPage, /模拟发布检查/);
    assert.doesNotMatch(organizerNewEventPage, /本地活动记录已生成/);
  });

  it("keeps event publishing on an authenticated edit-permission API path", () => {
    expectSource(eventPublishRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(eventPublishRoute, "getSupabaseServiceClient");
    expectSource(eventPublishRoute, "enforceRateLimit(request");
    expectSource(eventPublishRoute, 'keyPrefix: "events:publish"');
    expectSource(eventPublishRoute, "canEditEvent(authContext.supabase, eventId)");
    expectSource(eventPublishRoute, '.select("id, organizer_id, price_cents, payment_code_img, review_status")');
    expectSource(eventPublishRoute, 'paidEventVerificationStatuses.includes(String(verification.status))');
    expectSource(eventPublishRoute, "verification.force_review_required === true");
    expectSource(eventPublishRoute, "收费活动需要主办方完成认证");
    expectSource(eventPublishRoute, '["pending", "changes_requested", "rejected", "suspended"].includes(String(event.review_status))');
    expectSource(eventPublishRoute, "该活动仍在平台审核中或未通过审核");
    expectSource(eventPublishRoute, 'status: "registration_open"');
    expectSource(eventPublishRoute, '.in("status", ["draft", "interest_collecting", "registration_scheduled"])');

    expectSource(organizerEventPage, "status={event.status}");
    expectSource(organizerEventActions, 'fetch("/api/events/publish"');
    expectSource(organizerEventActions, 'status === "草稿配置"');
  });

  it("keeps organizer event basics editing on an authenticated edit-permission API path", () => {
    expectSource(eventUpdateRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(eventUpdateRoute, "enforceRateLimit(request");
    expectSource(eventUpdateRoute, 'keyPrefix: "events:update"');
    expectSource(eventUpdateRoute, "canEditEvent(authContext.supabase, eventId)");
    expectSource(eventUpdateRoute, ".not(\"status\", \"in\", \"(cancelled,expired,refunded)\")");
    expectSource(eventUpdateRoute, "capacity < activeRegistrationCount");
    expectSource(eventUpdateRoute, "reviewSensitiveStatuses");
    expectSource(eventUpdateRoute, "reviewSensitiveChanges");
    expectSource(eventUpdateRoute, "review_status: requiresReview ? \"pending\" : currentEvent.review_status");
    expectSource(eventUpdateRoute, '.from("review_requests")');
    expectSource(eventUpdateRoute, 'target_type: "event"');
    expectSource(eventUpdateRoute, "review_required: requiresReview");
    expectSource(eventUpdateRoute, '.from("events")');

    expectSource(organizerEventPage, "<EventBasicsEditor event={event} />");
    expectSource(eventBasicsEditor, 'fetch("/api/events/update"');
    expectSource(eventBasicsEditor, "getSupabaseBrowserClient()");
    expectSource(eventBasicsEditor, "supabase.auth.getSession()");
    expectSource(eventBasicsEditor, "关键变更已提交平台复审");
  });

  it("keeps organizer collaborator management on the authenticated atomic RPC path", () => {
    expectSource(eventOrganizerRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(eventOrganizerRoute, "enforceRateLimit(request");
    expectSource(eventOrganizerRoute, 'keyPrefix: "events:organizers"');
    expectSource(eventOrganizerRoute, 'authContext.supabase.rpc("manage_event_organizer_atomic"');
    expectSource(eventOrganizerRoute, 'p_action: action');
    expectSource(eventOrganizerRoute, 'p_permissions: permissions');
    expectSource(eventOrganizerRoute, 'p_user_agent: request.headers.get("user-agent") ?? "unknown"');
    expectSource(eventOrganizerRoute, "export async function DELETE(request: Request)");
    expectSource(eventOrganizerRoute, "export async function PATCH(request: Request)");
    assert.doesNotMatch(eventOrganizerRoute, /owner:\s*"owner"/);
    assert.doesNotMatch(eventOrganizerRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(eventOrganizerRoute, /\.from\("event_organizers"\)/);
    assert.doesNotMatch(eventOrganizerRoute, /\.from\("audit_logs"\)/);

    expectSource(eventIdentityPanel, 'fetch("/api/events/organizers"');
    expectSource(eventIdentityPanel, 'method: "DELETE"');
    expectSource(eventIdentityPanel, 'method: "PATCH"');
    expectSource(eventIdentityPanel, "getSupabaseBrowserClient()");
    expectSource(eventIdentityPanel, "supabase.auth.getSession()");
    expectSource(eventIdentityPanel, "can_manage_payments");
    expectSource(eventIdentityPanel, 'organizer.role === "主办"');
    expectSource(eventIdentityPanel, 'className="compact-select"');
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
    expectSource(serverApi, "export async function canManageEventFinance(supabase: SupabaseClient, eventId: string)");
    expectSource(serverApi, 'supabase.rpc("can_manage_event_finance"');
    assert.doesNotMatch(serverApi, /export async function canManageEvent[\s\S]*?\.from\("event_organizers"\)/);

    for (const route of [exportAttendeesRoute, exportFinanceRoute]) {
      expectSource(route, "getAuthenticatedSupabaseClient(request)");
      expectSource(route, "getSupabaseServiceClient()");
      assert.doesNotMatch(route, /canManageEventByAuthUserId/);
    }

    expectSource(exportAttendeesRoute, "canManageEvent(authContext.supabase, event.id)");
    expectSource(exportFinanceRoute, "canManageEventFinance(authContext.supabase, event.id)");
    assert.doesNotMatch(exportFinanceRoute, /canManageEvent\(authContext\.supabase, event\.id\)/);
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

  it("keeps the registration page on the shared Supabase public event detail adapter", () => {
    expectSource(registerPage, 'import { getPublicEventDetail } from "@/lib/events-data";');
    expectSource(registerPage, "await getPublicEventDetail(eventId)");
    expectSource(registerPage, "eventDetail.event");
    expectSource(registerPage, "eventDetail.setup");
    expectSource(eventsData, 'private: "好友聚会"');
    expectSource(eventsData, 'payment_registration: "报名收款"');
    expectSource(eventsData, 'checkin: "签到活动"');

    assert.doesNotMatch(registerPage, /findEvent|getEventSetup|@\/lib\/mock-data/);
  });

  it("keeps the participant order list on the authenticated Supabase orders adapter", () => {
    expectSource(myOrdersPage, 'import { getMyOrders } from "@/lib/orders-data";');
    expectSource(myOrdersPage, "await getMyOrders()");
    expectSource(myOrdersPage, "eventsById.get(registration.eventId)");
    expectSource(myOrdersPage, "registrations.length === 0");
    expectSource(ordersData, "export async function getMyOrders()");
    expectSource(ordersData, "await createSupabaseServerClient()");
    expectSource(ordersData, "await supabase.auth.getUser()");
    expectSource(ordersData, "findUserByAuthUserId(supabase, user.id)");
    expectSource(ordersData, '.eq("user_id", appUser.id)');
    expectSource(ordersData, "function emptySupabaseMyOrders()");

    assert.doesNotMatch(myOrdersPage, /@\/lib\/mock-data|events,\s*registrations/);
  });

  it("keeps the organizer dashboard on the authenticated Supabase organizer adapter", () => {
    expectSource(organizerPage, 'import { getOrganizerDashboard } from "@/lib/organizer-data";');
    expectSource(organizerPage, 'import { OrganizerVerificationPanel } from "@/components/organizer-verification-panel";');
    expectSource(organizerPage, "await getOrganizerDashboard()");
    expectSource(organizerPage, "<OrganizerVerificationPanel />");
    expectSource(organizerPage, "organizersByEventId.get(event.id)");
    expectSource(organizerPage, 'href="/organizer/events/new"');
    expectSource(organizerData, "export async function getOrganizerDashboard()");
    expectSource(organizerData, "await createSupabaseServerClient()");
    expectSource(organizerData, "await supabase.auth.getUser()");
    expectSource(organizerData, "findUserByAuthUserId(supabase, user.id)");
    expectSource(organizerData, '.from("event_organizers")');
    expectSource(organizerData, '.eq("user_id", appUser.id)');
    expectSource(organizerData, '.eq("organizer_id", appUser.id)');
    expectSource(organizerData, "eventRowToGatherEvent(row)");
    expectSource(organizerData, "rowToRegistration");

    assert.doesNotMatch(organizerPage, /import\s+\{[^}]*eventSetups|import\s+\{[^}]*registrations|getEventOrganizers/);
  });

  it("keeps organizer verification applications on an authenticated Supabase path", () => {
    expectSource(organizerVerificationRoute, "export async function GET(request: Request)");
    expectSource(organizerVerificationRoute, "export async function POST(request: Request)");
    expectSource(organizerVerificationRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(organizerVerificationRoute, "enforceRateLimit(request");
    expectSource(organizerVerificationRoute, 'keyPrefix: "organizer:verification"');
    expectSource(organizerVerificationRoute, "findUserByAuthUserId(authContext.supabase, authContext.user.id)");
    expectSource(organizerVerificationRoute, '.from("organizer_verifications")');
    expectSource(organizerVerificationRoute, 'status: "pending"');
    expectSource(organizerVerificationRoute, "approvedStatuses.has(String(existing?.status))");
    expectSource(organizerVerificationPanel, 'fetch("/api/organizer/verification"');
    expectSource(organizerVerificationPanel, 'method: "POST"');
    expectSource(organizerVerificationPanel, "收费活动开放报名前，主办方需要完成认证。");
  });

  it("keeps admin organizer verification review on a platform-admin-only path", () => {
    expectSource(adminOrganizerVerificationRoute, "export async function GET(request: Request)");
    expectSource(adminOrganizerVerificationRoute, "export async function POST(request: Request)");
    expectSource(adminOrganizerVerificationRoute, "requirePlatformAdmin(request)");
    expectSource(adminOrganizerVerificationRoute, "getSupabaseServiceClient()");
    expectSource(adminOrganizerVerificationRoute, "enforceRateLimit(request");
    expectSource(adminOrganizerVerificationRoute, 'keyPrefix: "admin:organizer-verifications"');
    expectSource(adminOrganizerVerificationRoute, '.from("organizer_verifications")');
    expectSource(adminOrganizerVerificationRoute, '.from("audit_logs").insert');
    expectSource(adminOrganizerVerificationRoute, "organizer_verification.");
    expectSource(adminPage, 'import { AdminVerificationReviewPanel } from "@/components/admin-verification-review-panel";');
    expectSource(adminPage, "<AdminVerificationReviewPanel />");
    expectSource(adminVerificationReviewPanel, 'fetch("/api/admin/organizer-verifications"');
    expectSource(adminVerificationReviewPanel, 'method: "POST"');
    expectSource(adminVerificationReviewPanel, "主办认证审核");
  });

  it("keeps admin event review on the platform-admin review gate", () => {
    expectSource(serverAdmin, "export async function requirePlatformAdmin(request: Request)");
    expectSource(serverAdmin, "getAuthenticatedSupabaseClient(request)");
    expectSource(serverAdmin, 'authContext.supabase.rpc("is_platform_admin"');
    expectSource(adminEventReviewRoute, "export async function GET(request: Request)");
    expectSource(adminEventReviewRoute, "export async function POST(request: Request)");
    expectSource(adminEventReviewRoute, "requirePlatformAdmin(request)");
    expectSource(adminEventReviewRoute, "getSupabaseServiceClient()");
    expectSource(adminEventReviewRoute, "enforceRateLimit(request");
    expectSource(adminEventReviewRoute, 'keyPrefix: "admin:event-reviews"');
    expectSource(adminEventReviewRoute, '.from("review_requests")');
    expectSource(adminEventReviewRoute, '.eq("target_type", "event")');
    expectSource(adminEventReviewRoute, '.from("events")');
    expectSource(adminEventReviewRoute, "review_status: nextStatus");
    expectSource(adminEventReviewRoute, '.from("audit_logs").insert');
    expectSource(adminEventReviewRoute, "event_review.");
    expectSource(adminPage, 'import { AdminEventReviewPanel } from "@/components/admin-event-review-panel";');
    expectSource(adminPage, "<AdminEventReviewPanel />");
    expectSource(adminEventReviewPanel, 'fetch("/api/admin/event-reviews"');
    expectSource(adminEventReviewPanel, 'method: "POST"');
    expectSource(adminEventReviewPanel, "活动审核");
  });

  it("keeps the organizer event workspace on the authenticated Supabase organizer detail adapter", () => {
    expectSource(organizerEventPage, 'import { getOrganizerEventDetail } from "@/lib/organizer-data";');
    expectSource(organizerEventPage, 'import { AuditLogTimeline } from "@/components/audit-log-timeline";');
    expectSource(organizerEventPage, "await getOrganizerEventDetail(eventId)");
    expectSource(organizerEventPage, "const { announcements, auditLogs, event, organizers, registrations, setup } = eventDetail;");
    expectSource(organizerEventPage, "<AuditLogTimeline logs={auditLogs} />");
    expectSource(organizerData, "export async function getOrganizerEventDetail(eventId: string)");
    expectSource(organizerData, "auditLogs: EventAuditLog[];");
    expectSource(organizerData, "await createSupabaseServerClient()");
    expectSource(organizerData, "findUserByAuthUserId(supabase, user.id)");
    expectSource(organizerData, "await canManageEvent(supabase, eventRow.id)");
    expectSource(organizerData, '.from("announcements")');
    expectSource(organizerData, '.from("registrations")');
    expectSource(organizerData, '.from("event_organizers")');
    expectSource(organizerData, '.from("audit_logs")');
    expectSource(organizerData, '.select("id, actor_role, target_type, action, risk_level, reason, before_snapshot, after_snapshot, created_at")');
    expectSource(organizerData, ".limit(12)");
    expectSource(auditLogTimeline, "export function AuditLogTimeline");
    expectSource(auditLogTimeline, "beforeSummary");
    expectSource(auditLogTimeline, "afterSummary");
    expectSource(auditLogTimeline, "riskLevel");

    assert.doesNotMatch(
      organizerEventPage,
      /findEvent|getEventAnnouncements|getEventOrganizers|getEventRegistrations|getEventSetup|@\/lib\/mock-data/
    );
  });

  it("keeps the organizer finance workspace on the finance-scoped Supabase adapter", () => {
    expectSource(organizerFinancePage, 'import { getOrganizerFinanceDetail } from "@/lib/organizer-data";');
    expectSource(organizerFinancePage, "await getOrganizerFinanceDetail(eventId)");
    expectSource(organizerFinancePage, "const { event, expenses, registrations, setting, summary } = financeDetail;");
    expectSource(organizerData, "export async function getOrganizerFinanceDetail(eventId: string)");
    expectSource(organizerData, 'supabase.rpc("can_manage_event_finance"');
    expectSource(organizerData, '.from("event_finance_settings")');
    expectSource(organizerData, '.from("event_expenses")');
    expectSource(organizerData, "users!event_expenses_paid_by_fkey(name, public_id)");
    expectSource(organizerData, "buildFinanceSummary(eventRegistrations, expenses)");

    assert.doesNotMatch(
      organizerFinancePage,
      /findEvent|getEventExpenses|getEventFinanceSetting|getEventFinanceSummary|getEventRegistrations|@\/lib\/mock-data/
    );
  });

  it("keeps organizer expense creation on the authenticated finance-scoped API path", () => {
    expectSource(expenseRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(expenseRoute, "enforceRateLimit(request");
    expectSource(expenseRoute, 'keyPrefix: "expenses:create"');
    expectSource(expenseRoute, "canManageEventFinance(authContext.supabase, eventId)");
    expectSource(expenseRoute, '.from("event_expenses")');
    expectSource(expenseRoute, "findUserByAuthUserId(authContext.supabase, authContext.user.id)");
    expectSource(expenseRoute, "餐饮茶歇: \"food\"");
    expectSource(expenseRoute, "交通快递: \"transport\"");

    expectSource(organizerFinancePage, "<ExpenseLedger eventId={event.id} expenses={expenses} />");
    expectSource(expenseLedger, 'fetch("/api/expenses"');
    expectSource(expenseLedger, "getSupabaseBrowserClient()");
    assert.doesNotMatch(expenseLedger, /接入数据库后会长期保存/);
  });

  it("keeps organizer expense proofs bound to the private Storage path and finance API", () => {
    expectSource(expenseProofRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(expenseProofRoute, "getSupabaseServiceClient()");
    expectSource(expenseProofRoute, "enforceRateLimit(request");
    expectSource(expenseProofRoute, 'keyPrefix: "expenses:proof"');
    expectSource(expenseProofRoute, 'replace(/^expense-proofs\\//, "")');
    expectSource(expenseProofRoute, "canManageEventFinance(authContext.supabase, eventId)");
    expectSource(expenseProofRoute, "findUserByAuthUserId(authContext.supabase, authContext.user.id)");
    expectSource(expenseProofRoute, '.eq("bucket_id", "expense-proofs")');
    expectSource(expenseProofRoute, '.from("event_expenses")');
    expectSource(expenseProofRoute, "proof_url: storagePath");
    expectSource(expenseProofRoute, "writeExpenseProofAudit");
    expectSource(expenseProofRoute, 'action: "expense_proof.uploaded"');
    expectSource(expenseProofRoute, "export async function DELETE(request: Request)");
    expectSource(expenseProofRoute, "只有活动主办或财务协作者可以作废支出凭证。");
    expectSource(expenseProofRoute, "proof_url: null");
    expectSource(expenseProofRoute, '.eq("proof_url", expense.proof_url)');
    expectSource(expenseProofRoute, 'action: "expense_proof.voided"');
    expectSource(expenseProofRoute, '.from("audit_logs").insert');

    expectSource(organizerFinancePage, "<ExpenseProofList eventId={event.id} expenses={expenses} />");
    expectSource(expenseProofList, '.from("expense-proofs")');
    expectSource(expenseProofList, 'fetch("/api/expenses/proof"');
    expectSource(expenseProofList, 'method: "DELETE"');
    expectSource(expenseProofList, "作废凭证");
    expectSource(expenseProofList, "`${eventId}/${expense.id}/${Date.now()}-${safeFileName(file.name)}`");
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

  it("keeps organizer announcements published through an authenticated API route", () => {
    expectSource(announcementPublishRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(announcementPublishRoute, "enforceRateLimit(request");
    expectSource(announcementPublishRoute, 'keyPrefix: "announcements:create"');
    expectSource(announcementPublishRoute, '.from("announcements")');
    expectSource(announcementPublishRoute, ".insert({");
    expectSource(announcementPublishRoute, "published_at: status === \"published\" ? new Date().toISOString() : null");
    expectSource(announcementCenter, 'fetch("/api/announcements"');
    expectSource(announcementCenter, "Authorization: `Bearer ${accessToken}`");
    expectSource(announcementCenter, "通知已发布并写入数据库");
    expectSource(announcementCenter, "真实发布需要先使用 Supabase 账号登录");
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
