type StatusBadgeProps = {
  children: string;
};

export function StatusBadge({ children }: StatusBadgeProps) {
  const tone = children.includes("确认") || children.includes("报名中") || children.includes("已开放") || children.includes("已支付") || children.includes("已发布")
    ? "success"
    : children.includes("待") || children.includes("截止") || children.includes("提交") || children.includes("数调") || children.includes("预算")
      ? "warning"
      : children.includes("驳回") || children.includes("取消")
        ? "danger"
        : "neutral";

  return <span className={`status-badge ${tone}`}>{children}</span>;
}
