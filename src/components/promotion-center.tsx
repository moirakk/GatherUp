"use client";

import { useMemo, useState } from "react";
import { Copy, Download, ImagePlus, Megaphone, PackagePlus, QrCode } from "lucide-react";

import { type GatherEvent } from "@/lib/mock-data";

type PromotionCenterProps = {
  event: GatherEvent;
  surveyVotes: number;
  venueVotes: number;
};

function getOrigin() {
  if (typeof window === "undefined") {
    return "https://gatherup.app";
  }

  return window.location.origin;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PromotionCenter({ event, surveyVotes, venueVotes }: PromotionCenterProps) {
  const [notice, setNotice] = useState("");
  const [qrMode, setQrMode] = useState<"survey" | "register">("survey");
  const [materials, setMaterials] = useState([
    { id: "ticket", name: "纪念票根", note: "入场领取，可用于拍照打卡", imageName: "" },
    { id: "sticker", name: "主题贴纸", note: "随票附赠，数量有限", imageName: "" },
    { id: "postcard", name: "观影明信片", note: "付款确认后预留", imageName: "" }
  ]);

  const links = useMemo(() => {
    const origin = getOrigin();
    return {
      survey: `${origin}/events/${event.id}/register?step=survey`,
      register: `${origin}/events/${event.id}/register?step=profile`,
      detail: `${origin}/events/${event.id}`
    };
  }, [event.id]);

  const groupCopy = `【${event.name}】\n时间：${event.startsAt}\n城市/场地：${event.city} · ${event.venue}\n当前阶段：先完成数调和地点偏好，确认后再开放正式报名。\n数调链接：${links.survey}\n活动 ID：${event.publicCode}`;

  const socialCopy = `${event.name}\n\n${event.description}\n\n城市：${event.city}\n场地：${event.venue}\n报名/数调入口：${links.detail}\n活动 ID：${event.publicCode}`;
  const materialCopy = `【${event.name} 物料预告】\n${materials
    .map((material, index) => `${index + 1}. ${material.name}：${material.note}`)
    .join("\n")}\n\n具体物料以现场发放为准。活动 ID：${event.publicCode}`;

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label}已复制`);
    } catch {
      setNotice(`复制失败，请手动复制：${value}`);
    }
  }

  function updateMaterial(id: string, field: "name" | "note" | "imageName", value: string) {
    setMaterials((current) =>
      current.map((material) => (material.id === id ? { ...material, [field]: value } : material))
    );
  }

  function addMaterial() {
    setMaterials((current) => [
      ...current,
      {
        id: `material-${Date.now()}`,
        name: "新物料",
        note: "填写发放说明",
        imageName: ""
      }
    ]);
  }

  return (
    <div className="promotion-layout">
      <section className="promotion-main">
        {notice && <p className="inline-notice">{notice}</p>}
        <div className="promotion-hero">
          <div>
            <p className="eyebrow">发布与宣传</p>
            <h2>把活动入口发出去，并追踪回收情况</h2>
            <p className="subtle">主办方可以直接复制群公告、报名链接和宣传文案。第一版先做可操作入口，后续接真实访问量和提交量。</p>
          </div>
          <Megaphone size={24} />
        </div>

        <div className="promotion-actions-grid">
          <button className="share-card" type="button" onClick={() => copyText("群公告", groupCopy)}>
            <Copy size={18} />
            <span>复制群公告</span>
            <small>适合微信群、QQ群、社群公告</small>
          </button>
          <button className="share-card" type="button" onClick={() => copyText("数调链接", links.survey)}>
            <Copy size={18} />
            <span>复制数调链接</span>
            <small>先收集时间和地点偏好</small>
          </button>
          <button className="share-card" type="button" onClick={() => copyText("报名链接", links.register)}>
            <Copy size={18} />
            <span>复制报名链接</span>
            <small>确认场地和收款后使用</small>
          </button>
          <button className="share-card" type="button" onClick={() => copyText("社交平台文案", socialCopy)}>
            <Copy size={18} />
            <span>复制宣传文案</span>
            <small>适合小红书、微博、朋友圈</small>
          </button>
          <button className="share-card" type="button" onClick={() => downloadText(`${event.publicCode}-promotion.txt`, `${groupCopy}\n\n---\n\n${socialCopy}`)}>
            <Download size={18} />
            <span>下载宣传包</span>
            <small>保存群公告和社交文案</small>
          </button>
          <button className="share-card" type="button" onClick={() => setQrMode(qrMode === "survey" ? "register" : "survey")}>
            <QrCode size={18} />
            <span>切换二维码</span>
            <small>{qrMode === "survey" ? "当前：数调入口" : "当前：报名入口"}</small>
          </button>
        </div>

        <div className="copy-preview-grid">
          <article>
            <strong>群公告预览</strong>
            <p>{groupCopy}</p>
          </article>
          <article>
            <strong>社交平台文案预览</strong>
            <p>{socialCopy}</p>
          </article>
        </div>

        <section className="materials-section">
          <div className="section-heading">
            <div>
              <h3>物料展示</h3>
              <p className="subtle">给主办方一个专门展示无料、票根、贴纸、海报和应援物的位置。名称可自定义，方便直接用于宣传。</p>
            </div>
            <PackagePlus size={20} />
          </div>
          <div className="materials-toolbar">
            <button className="button secondary" type="button" onClick={() => copyText("物料清单", materialCopy)}>
              <Copy size={16} />
              复制物料清单
            </button>
            <button className="button secondary" type="button" onClick={addMaterial}>
              <PackagePlus size={16} />
              添加物料
            </button>
          </div>
          <div className="material-grid">
            {materials.map((material) => (
              <article className="material-card" key={material.id}>
                <label className="material-image">
                  <ImagePlus size={24} />
                  <span>{material.imageName || "上传效果图"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        updateMaterial(material.id, "imageName", file.name);
                      }
                    }}
                  />
                </label>
                <label>
                  物料名称
                  <input value={material.name} onChange={(event) => updateMaterial(material.id, "name", event.target.value)} />
                </label>
                <label>
                  展示说明
                  <input value={material.note} onChange={(event) => updateMaterial(material.id, "note", event.target.value)} />
                </label>
              </article>
            ))}
          </div>
        </section>
      </section>

      <aside className="promotion-side">
        <div className="qr-preview large" aria-label="宣传二维码预览">
          <QrCode size={92} />
          <span>{qrMode === "survey" ? "数调入口" : "报名入口"}</span>
        </div>
        <dl className="summary-list">
          <div><dt>活动 ID</dt><dd>{event.publicCode}</dd></div>
          <div><dt>当前状态</dt><dd>{event.status}</dd></div>
          <div><dt>数调反馈</dt><dd>{surveyVotes} 份</dd></div>
          <div><dt>地点投票</dt><dd>{venueVotes} 票</dd></div>
          <div><dt>报名人数</dt><dd>{event.registered}/{event.capacity}</dd></div>
        </dl>
      </aside>
    </div>
  );
}
