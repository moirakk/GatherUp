import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildOrganizerDashboardMetrics } from "../src/domain/organizer-dashboard-metrics.ts";
import type { EventSetup, GatherEvent, Registration } from "../src/lib/mock-data.ts";

const baseEvent: GatherEvent = {
  id: "event-1",
  publicCode: "GU-METRIC",
  name: "Dashboard metrics check",
  category: "同好活动",
  template: "选座活动",
  customTypeLabel: "测试活动",
  city: "东京",
  venue: "测试场地",
  address: "测试地址",
  startsAt: "2026-07-16 12:00",
  deadline: "2026-07-15 23:59",
  price: 100,
  capacity: 10,
  registered: 4,
  paid: 3,
  seated: 2,
  status: "报名中",
  allowMulti: true,
  maxPeoplePerOrder: 2,
  orderPrefix: "MET",
  description: "metric fixture"
};

function setup(overrides: Partial<EventSetup>): EventSetup {
  return {
    eventId: "event-1",
    nextAction: "继续处理",
    paymentMethod: "微信收款码",
    paymentQrStatus: "未配置",
    setupStatus: "草稿配置",
    surveyOptions: [],
    venueOptions: [],
    ...overrides
  };
}

function registration(overrides: Partial<Registration>): Registration {
  return {
    amount: 100,
    attendeeIds: [],
    confirmationEta: "已确认",
    createdAt: "2026-07-16",
    eventId: "event-1",
    nickname: "测试用户",
    orderNumber: `GU-${Math.random()}`,
    paymentStatus: "付款已确认",
    quantity: 1,
    refundPolicy: "测试退款规则",
    registrationStatus: "已确认",
    seatStatus: "已选座",
    ...overrides
  };
}

describe("organizer dashboard metrics", () => {
  it("summarizes pending reviews, check-in rate, seating progress, revenue, and refund exposure", () => {
    const metrics = buildOrganizerDashboardMetrics(
      [
        baseEvent,
        { ...baseEvent, id: "event-2", capacity: 5, seated: 1 }
      ],
      [
        setup({ paymentQrStatus: "已配置", setupStatus: "报名已开放" }),
        setup({ eventId: "event-2", paymentQrStatus: "未配置", setupStatus: "数调中" })
      ],
      [
        registration({ amount: 100, checkInStatus: "CHECKED_IN", quantity: 2 }),
        registration({ amount: 80, checkInStatus: "NOT_ARRIVED", quantity: 1 }),
        registration({ amount: 50, paymentStatus: "待审核", registrationStatus: "已提交" }),
        registration({ amount: 20, paymentStatus: "已退款", registrationStatus: "已取消" })
      ]
    );

    assert.equal(metrics.activeSetupCount, 1);
    assert.equal(metrics.paymentReadyCount, 1);
    assert.equal(metrics.pendingPaymentCount, 1);
    assert.equal(metrics.paidCount, 3);
    assert.equal(metrics.checkInRatePercent, 67);
    assert.equal(metrics.seatedCount, 3);
    assert.equal(metrics.seatingProgressPercent, 100);
    assert.equal(metrics.totalCapacity, 15);
    assert.equal(metrics.confirmedRevenue, 180);
    assert.equal(metrics.refundExposureCount, 1);
  });

  it("keeps percentage metrics at zero when there is no denominator", () => {
    const metrics = buildOrganizerDashboardMetrics([], [], []);

    assert.equal(metrics.checkInRatePercent, 0);
    assert.equal(metrics.seatingProgressPercent, 0);
    assert.equal(metrics.confirmedRevenue, 0);
  });
});
