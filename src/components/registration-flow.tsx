"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, FileImage, ShieldCheck, TicketCheck, UsersRound } from "lucide-react";

import type { GatherEvent } from "@/lib/mock-data";

type RegistrationFlowProps = {
  event: GatherEvent;
};

type FlowStep = "profile" | "payment" | "waiting";

export function RegistrationFlow({ event }: RegistrationFlowProps) {
  const [step, setStep] = useState<FlowStep>("profile");
  const [nickname, setNickname] = useState("比奇堡miki");
  const [contact, setContact] = useState("moirahoumiki@example.com");
  const [quantity, setQuantity] = useState(1);
  const [attendeeIds, setAttendeeIds] = useState(["GU-MIKI"]);
  const [screenshotName, setScreenshotName] = useState("");
  const [message, setMessage] = useState("");

  const orderNumber = `${event.orderPrefix}-0029`;
  const amount = event.price * quantity;
  const isFreeEvent = amount === 0;

  const attendeeSlots = useMemo(() => {
    return Array.from({ length: quantity }, (_, index) => attendeeIds[index] ?? "");
  }, [attendeeIds, quantity]);

  function updateQuantity(nextQuantity: number) {
    setQuantity(nextQuantity);
    setAttendeeIds((current) =>
      Array.from({ length: nextQuantity }, (_, index) => current[index] ?? (index === 0 ? "GU-MIKI" : ""))
    );
  }

  function updateAttendeeId(index: number, value: string) {
    setAttendeeIds((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function submitProfile() {
    setMessage("");

    if (isFreeEvent) {
      setStep("waiting");
      return;
    }

    setStep("payment");
  }

  function submitPayment() {
    if (!screenshotName) {
      setMessage("请先选择付款截图，再提交给组织者确认。");
      return;
    }

    setMessage("");
    setStep("waiting");
  }

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">活动报名</p>
          <h1>{event.name}</h1>
          <p className="subtle">
            {event.category} · {event.template} · {event.city} · {event.startsAt}
          </p>
        </div>
      </section>

      <section className="registration-layout">
        <article className="content-card">
          <div className="progress-rail" aria-label="报名进度">
            <span className={step === "profile" ? "active" : "done"}>填写信息</span>
            <span className={step === "payment" ? "active" : step === "waiting" ? "done" : ""}>
              {isFreeEvent ? "提交报名" : "上传付款"}
            </span>
            <span className={step === "waiting" ? "active" : ""}>等待确认</span>
          </div>

          {step === "profile" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>报名信息</h2>
                  <p className="subtle">提交后会生成订单号，组织者可用它核对付款和名单。</p>
                </div>
                <TicketCheck size={22} />
              </div>

              <div className="form-grid">
                <label>显示昵称<input value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
                <label>联系方式<input value={contact} onChange={(event) => setContact(event.target.value)} /></label>
                <label>
                  报名人数
                  <select value={quantity} onChange={(event) => updateQuantity(Number(event.target.value))}>
                    {Array.from({ length: event.maxPeoplePerOrder }, (_, index) => index + 1).map((count) => (
                      <option disabled={!event.allowMulti && count > 1} key={count} value={count}>
                        {count} 人
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="attendee-list">
                {attendeeSlots.map((attendeeId, index) => (
                  <label className="inline-field" key={index}>
                    <span>{index === 0 ? "本人 GatherUp ID" : `同行人 ${index + 1} ID`}</span>
                    <input
                      value={attendeeId}
                      placeholder="例如 GU-MIKI"
                      onChange={(event) => updateAttendeeId(index, event.target.value)}
                    />
                  </label>
                ))}
              </div>

              <button className="button primary" type="button" onClick={submitProfile}>
                <ShieldCheck size={17} />
                生成订单
              </button>
            </div>
          )}

          {step === "payment" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>上传付款截图</h2>
                  <p className="subtle">当前版本先由组织者人工确认，确认后再开放选座或签到。</p>
                </div>
                <CreditCard size={22} />
              </div>

              <dl className="summary-list">
                <div><dt>订单号</dt><dd>{orderNumber}</dd></div>
                <div><dt>付款金额</dt><dd>¥{amount}</dd></div>
                <div><dt>付款备注</dt><dd>{orderNumber} + {nickname}</dd></div>
              </dl>

              <label className="upload-box">
                <FileImage size={24} />
                <strong>{screenshotName || "选择付款截图"}</strong>
                <span>支持上传微信、支付宝或银行转账截图。</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const nextFileName = event.target.files?.[0]?.name ?? "";
                    setScreenshotName(nextFileName);
                    setMessage(nextFileName ? "已选择截图，可以提交给组织者确认。" : "");
                  }}
                />
              </label>

              {message && <p className="validation-note">{message}</p>}

              <button
                className="button primary"
                type="button"
                onClick={submitPayment}
              >
                提交截图，等待确认
              </button>
            </div>
          )}

          {step === "waiting" && (
            <div className="flow-section success-panel">
              <CheckCircle2 size={34} />
              <h2>{isFreeEvent ? "报名已提交" : "付款截图已提交"}</h2>
              <p className="subtle">
                订单 {orderNumber} 已进入组织者确认队列。确认后，系统会开放对应的下一步操作。
              </p>
              <Link className="button secondary" href="/me">查看我的活动</Link>
            </div>
          )}
        </article>

        <aside className="action-card">
          <h2>订单预览</h2>
          <dl className="summary-list">
            <div><dt>订单号</dt><dd>{orderNumber}</dd></div>
            <div><dt>报名人</dt><dd>{nickname || "未填写"}</dd></div>
            <div><dt>人数</dt><dd>{quantity} 人</dd></div>
            <div><dt>金额</dt><dd>{isFreeEvent ? "免费" : `¥${amount}`}</dd></div>
            <div><dt>多人报名</dt><dd>{event.allowMulti ? `最多 ${event.maxPeoplePerOrder} 人` : "不支持"}</dd></div>
          </dl>
          <div className="notice-strip">
            <UsersRound size={16} />
            <span>同行人 ID 会进入同一订单，方便组织者统一核对。</span>
          </div>
        </aside>
      </section>
    </>
  );
}
