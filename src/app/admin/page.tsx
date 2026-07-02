import { AdminVerificationReviewPanel } from "@/components/admin-verification-review-panel";

export default function AdminPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">平台后台</p>
          <h1>审核工作台</h1>
          <p className="subtle">当前先覆盖主办认证审核，后续再扩展活动审核、投诉和平台配置。</p>
        </div>
      </section>

      <section className="setup-grid">
        <AdminVerificationReviewPanel />
      </section>
    </>
  );
}
