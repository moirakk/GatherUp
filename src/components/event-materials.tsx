import { ImagePlus, PackageCheck } from "lucide-react";

import { type GatherEvent } from "@/lib/mock-data";

type EventMaterialsProps = {
  event: GatherEvent;
};

function getDefaultMaterials(event: GatherEvent) {
  if (event.customTypeLabel.includes("观影") || event.template === "选座活动") {
    return [
      { name: "纪念票根", note: "入场领取，适合拍照打卡" },
      { name: "主题贴纸", note: "随票附赠，数量有限" },
      { name: "观影明信片", note: "付款确认后预留" }
    ];
  }

  return [
    { name: "活动手册", note: "现场领取，包含流程和注意事项" },
    { name: "签到贴纸", note: "签到后发放" },
    { name: "纪念卡片", note: "活动结束后领取" }
  ];
}

export function EventMaterials({ event }: EventMaterialsProps) {
  const materials = getDefaultMaterials(event);

  return (
    <section className="content-card">
      <div className="section-heading">
        <div>
          <h2>活动物料</h2>
          <p className="subtle">主办方准备的物料会在这里展示。实际领取规则以活动现场和主办通知为准。</p>
        </div>
        <PackageCheck size={20} />
      </div>
      <div className="public-material-grid">
        {materials.map((material) => (
          <article className="public-material-card" key={material.name}>
            <div className="public-material-image">
              <ImagePlus size={24} />
              <span>效果图待上传</span>
            </div>
            <strong>{material.name}</strong>
            <p>{material.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
