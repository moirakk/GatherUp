import Link from "next/link";

type MetricCardProps = {
  label: string;
  value: string | number;
  href?: string;
};

export function MetricCard({ label, value, href }: MetricCardProps) {
  const content = (
    <>
      <strong>{value}</strong>
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link className="metric-card clickable-card" href={href}>
        {content}
      </Link>
    );
  }

  return (
    <div className="metric-card">
      {content}
    </div>
  );
}
