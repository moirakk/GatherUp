import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleDollarSign, ClipboardList, FileImage, ReceiptText } from "lucide-react";

import { ExpenseLedger } from "@/components/expense-ledger";
import { FinanceActions } from "@/components/finance-actions";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import {
  findEvent,
  getEventExpenses,
  getEventFinanceSetting,
  getEventFinanceSummary,
  getEventRegistrations
} from "@/lib/mock-data";

type FinancePageProps = {
  params: Promise<{ eventId: string }>;
};

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString("zh-CN")}`;
}

export default async function FinancePage({ params }: FinancePageProps) {
  const { eventId } = await params;
  const event = findEvent(eventId);

  if (!event) {
    notFound();
  }

  const setting = getEventFinanceSetting(eventId);
  const summary = getEventFinanceSummary(eventId);
  const expenses = getEventExpenses(eventId);
  const registrations = getEventRegistrations(eventId);

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">活动财务</p>
          <h1>{event.name}</h1>
          <p className="subtle">{event.publicCode} · {setting.feeMode} · {setting.settlementRule}</p>
        </div>
        <div className="button-row">
          <Link className="button secondary" href={`/organizer/events/${event.id}`}>
            返回管理台
          </Link>
          <FinanceActions />
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="确认收入" value={formatMoney(summary.confirmedIncome)} />
        <MetricCard label="预计支出" value={formatMoney(summary.budgetedExpenses)} />
        <MetricCard label="预计结余" value={formatMoney(summary.netBalance)} />
      </section>

      <section className="metrics-grid">
        <MetricCard label="待审核收入" value={formatMoney(summary.pendingIncome)} />
        <MetricCard label="已支付/待报销" value={formatMoney(summary.paidExpenses)} />
        <MetricCard label="已确认人均成本" value={formatMoney(summary.perPaidPersonCost)} />
      </section>

      <section className="workspace-grid">
        <article className="content-card">
          <div className="section-heading">
            <div>
              <h2>财务规则</h2>
              <p className="subtle">收费、免费和 AA 活动都可以记录支出，但收入来源不同。</p>
            </div>
            <CircleDollarSign size={20} />
          </div>
          <dl className="summary-list">
            <div><dt>费用模式</dt><dd>{setting.feeMode}</dd></div>
            <div><dt>收入来源</dt><dd>{setting.revenueSource}</dd></div>
            <div><dt>币种</dt><dd>{setting.currency}</dd></div>
          </dl>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <h2>收入来源</h2>
              <p className="subtle">第一版收入来自报名订单和付款审核状态。</p>
            </div>
            <ClipboardList size={20} />
          </div>
          <div className="data-table compact">
            <div className="table-row header">
              <span>订单</span><span>昵称</span><span>人数</span><span>金额</span><span>状态</span>
            </div>
            {registrations.map((registration) => (
              <div className="table-row" key={registration.orderNumber}>
                <span>{registration.orderNumber}</span>
                <span>{registration.nickname}</span>
                <span>{registration.quantity}</span>
                <span>{formatMoney(registration.amount)}</span>
                <StatusBadge>{registration.paymentStatus}</StatusBadge>
              </div>
            ))}
          </div>
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <h2>支出记账</h2>
              <p className="subtle">场地费、物料、餐饮、设备和杂费会统一进入活动成本。</p>
            </div>
            <ReceiptText size={20} />
          </div>
          <ExpenseLedger expenses={expenses} />
        </article>

        <article className="content-card">
          <div className="section-heading">
            <div>
              <h2>凭证状态</h2>
              <p className="subtle">正式版会支持上传发票、小票和转账截图。</p>
            </div>
            <FileImage size={20} />
          </div>
          <div className="notice-list">
            {expenses.map((expense) => (
              <div key={`${expense.id}-proof`}>
                {expense.title}：{expense.proof === "pending" ? "待补充凭证" : expense.proof}
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
