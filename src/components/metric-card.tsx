import Link from "next/link";
import type { ReactNode } from "react";

type MetricCardProps = {
  icon?: ReactNode;
  label: string;
  meta?: string;
  tone?: "default" | "attention" | "positive";
  value: string | number;
  href?: string;
};

export function MetricCard({ icon, label, meta, tone = "default", value, href }: MetricCardProps) {
  const content = (
    <>
      <span className="metric-card-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {meta ? <small>{meta}</small> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link className={`metric-card clickable-card metric-${tone}`} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`metric-card metric-${tone}`}>
      {content}
    </div>
  );
}
