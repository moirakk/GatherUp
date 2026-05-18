"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  FileImage,
  MapPinned,
  ShieldCheck,
  TicketCheck,
  UserRoundCog,
  UsersRound
} from "lucide-react";

import type { GatherEvent } from "@/lib/mock-data";

type RegistrationFlowProps = {
  event: GatherEvent;
};

type FlowStep = "role" | "survey" | "location" | "profile" | "payment" | "waiting";

const flowSteps: Array<{ key: FlowStep; label: string }> = [
  { key: "role", label: "确认身份" },
  { key: "survey", label: "数调" },
  { key: "location", label: "地点投票" },
  { key: "profile", label: "报名" },
  { key: "payment", label: "付款确认" }
];

const scheduleOptions = ["6月21日 周日 14:00", "6月22日 周一 19:30", "6月23日 周二 19:30"];
const baseLocationOptions = ["大光明电影院", "百美汇影城 静安店"];

export function RegistrationFlow({ event }: RegistrationFlowProps) {
  const [step, setStep] = useState<FlowStep>("role");
  const [nickname, setNickname] = useState("比奇堡miki");
  const [contact, setContact] = useState("moirahoumiki@example.com");
  const [quantity, setQuantity] = useState(1);
  const [attendeeIds, setAttendeeIds] = useState(["GU-MIKI"]);
  const [screenshotName, setScreenshotName] = useState("");
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([scheduleOptions[1]]);
  const [selectedLocation, setSelectedLocation] = useState(event.venue);
  const [message, setMessage] = useState("");

  const orderNumber = `${event.orderPrefix}-0029`;
  const amount = event.price * quantity;
  const isFreeEvent = amount === 0;

  const attendeeSlots = useMemo(() => {
    return Array.from({ length: quantity }, (_, index) => attendeeIds[index] ?? "");
  }, [attendeeIds, quantity]);
  const locationOptions = useMemo(() => {
    return Array.from(new Set([event.venue, ...baseLocationOptions]));
  }, [event.venue]);

  function getProgressClass(targetStep: FlowStep) {
    const currentIndex = flowSteps.findIndex((item) => item.key === step);
    const targetIndex = flowSteps.findIndex((item) => item.key === targetStep);

    if (targetIndex === currentIndex) return "active";
    if (targetIndex < currentIndex || step === "waiting") return "done";
    return "";
  }

  function toggleSchedule(option: string) {
    setMessage("");
    setSelectedSchedules((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
    );
  }

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

  function submitSurvey() {
    if (selectedSchedules.length === 0) {
      setMessage("请至少选择一个你可以参加的时间。");
      return;
    }

    setMessage("");
    setStep("location");
  }

  function submitLocationVote() {
    if (!selectedLocation) {
      setMessage("请先选择一个偏好的活动地点。");
      return;
    }

    setMessage("");
    setStep("profile");
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
            参与者需先登录并完成数调、地点投票；组织者确认活动配置和收款二维码后，再进入报名付款。
          </p>
        </div>
      </section>

      <section className="registration-layout">
        <article className="content-card">
          <div className="progress-rail" aria-label="报名进度">
            {flowSteps.map((item) => (
              <span className={getProgressClass(item.key)} key={item.key}>{item.label}</span>
            ))}
          </div>

          {step === "role" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>先确认你的身份</h2>
                  <p className="subtle">组织者需要先配置活动信息、数调、地点投票和收款二维码；参与者登录后再参与后续流程。</p>
                </div>
                <UserRoundCog size={22} />
              </div>

              <div className="choice-grid">
                <button className="choice-card selected" type="button" onClick={() => setStep("survey")}>
                  <UsersRound size={20} />
                  <strong>我是参与者</strong>
                  <span>登录后参与数调、地点投票，再报名付款。</span>
                </button>
                <Link className="choice-card" href="/organizer/events/new">
                  <UserRoundCog size={20} />
                  <strong>我是组织者</strong>
                  <span>先创建活动，配置收款二维码和参与规则。</span>
                </Link>
              </div>
            </div>
          )}

          {step === "survey" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>数调：选择可参加时间</h2>
                  <p className="subtle">这一步用于帮组织者确定最合适的活动时间，付款不会在这里发生。</p>
                </div>
                <CalendarCheck size={22} />
              </div>

              <div className="option-list">
                {scheduleOptions.map((option) => (
                  <button
                    className={`option-card ${selectedSchedules.includes(option) ? "selected" : ""}`}
                    key={option}
                    type="button"
                    onClick={() => toggleSchedule(option)}
                  >
                    <span>{option}</span>
                    <strong>{selectedSchedules.includes(option) ? "已选择" : "可选择"}</strong>
                  </button>
                ))}
              </div>

              {message && <p className="validation-note">{message}</p>}

              <button className="button primary" type="button" onClick={submitSurvey}>
                提交数调，进入地点投票
              </button>
            </div>
          )}

          {step === "location" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>地点投票</h2>
                  <p className="subtle">参与者先投票表达偏好，组织者最终确认后才开放正式报名。</p>
                </div>
                <MapPinned size={22} />
              </div>

              <div className="option-list">
                {locationOptions.map((option) => (
                  <button
                    className={`option-card ${selectedLocation === option ? "selected" : ""}`}
                    key={option}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(option);
                      setMessage("");
                    }}
                  >
                    <span>{option}</span>
                    <strong>{selectedLocation === option ? "当前选择" : "投这一项"}</strong>
                  </button>
                ))}
              </div>

              {message && <p className="validation-note">{message}</p>}

              <button className="button primary" type="button" onClick={submitLocationVote}>
                提交地点偏好，继续报名
              </button>
            </div>
          )}

          {step === "profile" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>正式报名</h2>
                  <p className="subtle">数调和地点投票已完成。提交后会生成订单号，用于后续付款和名单核对。</p>
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
                订单 {orderNumber} 已进入组织者确认队列。组织者确认付款后，系统才会开放选座或签到。
              </p>
              <Link className="button secondary" href="/me">查看我的活动</Link>
            </div>
          )}
        </article>

        <aside className="action-card">
          <h2>当前流程</h2>
          <dl className="summary-list">
            <div><dt>身份</dt><dd>{step === "role" ? "待确认" : "参与者"}</dd></div>
            <div><dt>数调</dt><dd>{selectedSchedules.length ? `${selectedSchedules.length} 个可参加时间` : "未提交"}</dd></div>
            <div><dt>地点偏好</dt><dd>{selectedLocation || "未选择"}</dd></div>
            <div><dt>订单号</dt><dd>{orderNumber}</dd></div>
            <div><dt>报名人</dt><dd>{nickname || "未填写"}</dd></div>
            <div><dt>人数</dt><dd>{quantity} 人</dd></div>
            <div><dt>金额</dt><dd>{isFreeEvent ? "免费" : `¥${amount}`}</dd></div>
            <div><dt>多人报名</dt><dd>{event.allowMulti ? `最多 ${event.maxPeoplePerOrder} 人` : "不支持"}</dd></div>
          </dl>
          <div className="notice-strip">
            <UsersRound size={16} />
            <span>组织者完成活动配置和收款二维码后，参与者才会进入订单与付款确认。</span>
          </div>
        </aside>
      </section>
    </>
  );
}
