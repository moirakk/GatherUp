"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Mail, UserRound } from "lucide-react";

import {
  ID_COOKIE,
  NAME_COOKIE,
  getProfileOnboardingStorageKey,
  getAuthSession,
  normalizePublicId,
  publicIdPattern
} from "@/lib/auth";

const cookieOptions = "path=/; max-age=604800; SameSite=Lax";

export default function OnboardingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("GatherUp 用户");
  const [publicId, setPublicId] = useState("GU-USER");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = getAuthSession(document.cookie);

    if (!session) {
      return;
    }

    setEmail(session.email);
    setName(session.name);
    setPublicId(session.gatherUpId);
  }, []);

  function completeProfile() {
    const normalizedId = normalizePublicId(publicId);

    if (!name.trim()) {
      setMessage("请先填写一个昵称，活动名单里会用它帮助组织者识别你。");
      return;
    }

    if (!publicIdPattern.test(normalizedId)) {
      setMessage("GatherUp ID 需要以 GU- 开头，只能包含大写字母、数字和短横线。");
      return;
    }

    document.cookie = `${NAME_COOKIE}=${encodeURIComponent(name.trim())}; ${cookieOptions}`;
    document.cookie = `${ID_COOKIE}=${encodeURIComponent(normalizedId)}; ${cookieOptions}`;
    window.localStorage.setItem(getProfileOnboardingStorageKey(email), "done");
    router.replace("/");
  }

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">首次设置</p>
          <h1>补全账号资料</h1>
          <p className="subtle">这些信息会影响报名、同行人填写、订单识别和组织者名单管理。</p>
        </div>
      </section>

      <section className="form-layout">
        <article className="content-card setup-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">公开资料</p>
              <h2>确认你的活动身份</h2>
            </div>
            <UserRound size={22} />
          </div>

          <div className="form-grid">
            <label>
              昵称
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              GatherUp ID
              <input value={publicId} onChange={(event) => setPublicId(event.target.value)} />
            </label>
          </div>

          {message && <p className="validation-note">{message}</p>}

          <button className="button primary" type="button" onClick={completeProfile}>
            <BadgeCheck size={17} />
            完成设置
          </button>
        </article>

        <aside className="content-card setup-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">账号状态</p>
              <h2>长期有效的基础信息</h2>
            </div>
            <Mail size={22} />
          </div>

          <dl className="info-list">
            <div>
              <dt>登录邮箱</dt>
              <dd>{email || "待确认"}</dd>
            </div>
            <div>
              <dt>验证状态</dt>
              <dd>原型已模拟验证</dd>
            </div>
            <div>
              <dt>保存位置</dt>
              <dd>当前为浏览器本地，正式版进入数据库</dd>
            </div>
          </dl>

          <div className="notice-list">
            <div>正式版会为每个账号生成永久 user_id，邮箱、微信、Google、Apple 都只是登录入口。</div>
            <div>GatherUp ID 用于活动现场和同行人填写，最多修改两次。</div>
          </div>
        </aside>
      </section>
    </>
  );
}
