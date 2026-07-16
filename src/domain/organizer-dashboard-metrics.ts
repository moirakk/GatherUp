import type { EventSetup, GatherEvent, Registration } from "../lib/mock-data";

export type OrganizerDashboardMetrics = {
  activeSetupCount: number;
  checkInRatePercent: number;
  confirmedRevenue: number;
  paidCount: number;
  paymentReadyCount: number;
  pendingPaymentCount: number;
  refundExposureCount: number;
  seatedCount: number;
  seatingProgressPercent: number;
  totalCapacity: number;
  totalSetups: number;
};

function percent(part: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0;
}

export function buildOrganizerDashboardMetrics(
  events: GatherEvent[],
  eventSetups: EventSetup[],
  registrations: Registration[]
): OrganizerDashboardMetrics {
  const confirmedRegistrations = registrations.filter((registration) => registration.paymentStatus === "付款已确认");
  const paidCount = confirmedRegistrations.reduce((sum, registration) => sum + registration.quantity, 0);
  const checkedInCount = confirmedRegistrations
    .filter((registration) => registration.checkInStatus === "CHECKED_IN")
    .reduce((sum, registration) => sum + registration.quantity, 0);
  const seatedCount = events.reduce((sum, event) => sum + event.seated, 0);
  const eventPaidCount = events.reduce((sum, event) => sum + event.paid, 0);
  const totalCapacity = events.reduce((sum, event) => sum + event.capacity, 0);

  return {
    activeSetupCount: eventSetups.filter((setup) => setup.setupStatus !== "报名已开放").length,
    checkInRatePercent: percent(checkedInCount, paidCount),
    confirmedRevenue: confirmedRegistrations.reduce((sum, registration) => sum + registration.amount, 0),
    paidCount,
    paymentReadyCount: eventSetups.filter((setup) => setup.paymentQrStatus === "已配置").length,
    pendingPaymentCount: registrations.filter((registration) => registration.paymentStatus === "待审核").length,
    refundExposureCount: registrations.filter(
      (registration) => registration.paymentStatus === "已退款" || registration.registrationStatus === "已取消"
    ).length,
    seatedCount,
    seatingProgressPercent: percent(seatedCount, eventPaidCount),
    totalCapacity,
    totalSetups: eventSetups.length
  };
}
