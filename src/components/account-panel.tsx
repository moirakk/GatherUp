"use client";

import { useEffect, useMemo, useState } from "react";
import { AtSign, BadgeCheck, ShieldCheck } from "lucide-react";

import { ID_COOKIE, readDemoSession } from "@/lib/auth";

const maxPublicIdChanges = 2;

function getStoredChangeCount() {
  const storedValue = window.localStorage.getItem("gatherup_id_change_count");
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
    const session = readDemoSession(document.cookie);

    if (!session) {
      return;
    }

    const storedPublicId = window.localStorage.getItem("gatherup_public_id") || session.gatherUpId;
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
    const normalizedId = draftPublicId.trim().toUpperCase();

    if (normalizedId === publicId) {
      setMessage("当前 GatherUp ID 没有变化。");
      return;
    }

    if (!/^GU-[A-Z0-9-]{3,18}$/.test(normalizedId)) {
      setMessage("GatherUp ID 需要以 GU- 开头，只能包含大写字母、数字和短横线。");
      return;
    }

    if (remainingChanges <= 0) {
      setMessage("你的 GatherUp ID 修改次数已经用完。");
      return;
    }

    const nextChangeCount = changeCount + 1;
    const cookieOptions = "path=/; max-age=604800; SameSite=Lax";

    window.localStorage.setItem("gatherup_public_id", normalizedId);
    window.localStorage.setItem("gatherup_id_change_count", String(nextChangeCount));
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
          <div>邮箱：已绑定，后续支持验证码登录和忘记密码。</div>
          <div>手机号：预留，适合短信验证码和活动现场联系。</div>
          <div>微信：预留，适合未来 Web / 小程序账号打通。</div>
        </div>
      </article>
    </section>
  );
}
