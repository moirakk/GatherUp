"use client";

import { useEffect, useMemo, useState } from "react";
import { AtSign, BadgeCheck, ShieldCheck } from "lucide-react";

import {
  ID_COOKIE,
  PUBLIC_ID_CHANGE_COUNT_STORAGE_KEY,
  PUBLIC_ID_STORAGE_KEY,
  getAuthSession,
  maxPublicIdChanges,
  normalizePublicId,
  publicIdPattern
} from "@/lib/auth";

function getStoredChangeCount() {
  const storedValue = window.localStorage.getItem(PUBLIC_ID_CHANGE_COUNT_STORAGE_KEY);
  const parsedValue = Number(storedValue ?? 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function AccountPanel() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("GatherUp 用户");
  const [publicId, setPublicId] = useState("GU-USER");
  const [draftPublicId, setDraftPublicId] = useState("GU-USER");
  const [changeCount, setChangeCount] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = getAuthSession(document.cookie);

    if (!session) {
      return;
    }

    const storedPublicId = window.localStorage.getItem(PUBLIC_ID_STORAGE_KEY) || session.gatherUpId;
    const storedChangeCount = getStoredChangeCount();

    setEmail(session.email);
    setName(session.name);
    setPublicId(storedPublicId);
    setDraftPublicId(storedPublicId);
    setChangeCount(storedChangeCount);
  }, []);

  const remainingChanges = useMemo(() => {
    return Math.max(maxPublicIdChanges - changeCount, 0);
  }, [changeCount]);

  function updatePublicId() {
    const normalizedId = normalizePublicId(draftPublicId);

    if (normalizedId === publicId) {
      setMessage("当前 GatherUp ID 没有变化。");
      return;
    }

    if (!publicIdPattern.test(normalizedId)) {
      setMessage("GatherUp ID 需要以 GU- 开头，只能包含大写字母、数字和短横线。");
      return;
    }

    if (remainingChanges <= 0) {
      setMessage("你的 GatherUp ID 修改次数已经用完。");
      return;
    }

    const nextChangeCount = changeCount + 1;
    const cookieOptions = "path=/; max-age=604800; SameSite=Lax";

    window.localStorage.setItem(PUBLIC_ID_STORAGE_KEY, normalizedId);
    window.localStorage.setItem(PUBLIC_ID_CHANGE_COUNT_STORAGE_KEY, String(nextChangeCount));
    document.cookie = `${ID_COOKIE}=${encodeURIComponent(normalizedId)}; ${cookieOptions}`;

    setPublicId(normalizedId);
    setDraftPublicId(normalizedId);
    setChangeCount(nextChangeCount);
    setMessage("GatherUp ID 已更新。正式版会把这项记录保存到数据库。");
  }

  return (
    <section className="account-grid">
      <article className="content-card account-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">账号中心</p>
            <h2>{name}</h2>
          </div>
          <BadgeCheck size={22} />
        </div>

        <dl className="info-list">
          <div>
            <dt>登录邮箱</dt>
            <dd>{email || "miki@gatherup.local"}</dd>
          </div>
          <div>
            <dt>GatherUp ID</dt>
            <dd>{publicId}</dd>
          </div>
          <div>
            <dt>剩余修改</dt>
            <dd>{remainingChanges} / {maxPublicIdChanges}</dd>
          </div>
        </dl>
      </article>

      <article className="content-card account-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">公开 ID</p>
            <h2>用于同行人填写和活动名单识别</h2>
          </div>
          <AtSign size={22} />
        </div>

        <div className="form-grid">
          <label>
            GatherUp ID
            <input value={draftPublicId} onChange={(event) => setDraftPublicId(event.target.value)} />
          </label>
        </div>

        {message && <p className="validation-note">{message}</p>}

        <div className="button-row">
          <button className="button primary" type="button" onClick={updatePublicId}>
            保存 ID
          </button>
          <span className="subtle">最多修改两次。</span>
        </div>
      </article>

      <article className="content-card account-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">登录方式</p>
            <h2>后续接入验证码和绑定</h2>
          </div>
          <ShieldCheck size={22} />
        </div>

        <div className="notice-list">
          <div>邮箱：已绑定，作为全球账号底座，后续支持验证码登录和忘记密码。</div>
          <div>Google / Apple：预留，适合全球用户快捷登录和跨设备找回。</div>
          <div>手机号 / 微信：预留，适合中国区活动、小程序和现场联系。</div>
        </div>
      </article>
    </section>
  );
}
