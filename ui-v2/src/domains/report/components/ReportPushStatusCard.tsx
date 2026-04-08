interface ReportPushStatusCardProps {
  actionLabel: string;
  status: "idle" | "pending" | "success" | "error";
  message?: string;
  idleMessage?: string;
  hideErrorState?: boolean;
}

export default function ReportPushStatusCard({
  actionLabel,
  status,
  message,
  idleMessage,
  hideErrorState
}: ReportPushStatusCardProps) {
  if (status === "pending") {
    return <div className="cv-status-card" role="status">{actionLabel}进行中...</div>;
  }

  if (status === "success") {
    return <div className="cv-status-card" role="status">{message ?? `${actionLabel}成功`}</div>;
  }

  if (status === "error") {
    if (hideErrorState) {
      return null;
    }
    return <div className="cv-status-card" role="alert">{actionLabel}失败：{message ?? "请稍后重试"}</div>;
  }

  return <div className="cv-status-card">{idleMessage ?? `尚未${actionLabel}`}</div>;
}
