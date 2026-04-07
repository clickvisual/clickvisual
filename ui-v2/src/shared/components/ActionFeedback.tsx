import type { MutationStatus } from "../state/useMockMutation";

type ActionFeedbackProps = {
  status: MutationStatus;
  message?: string | null;
};

export default function ActionFeedback({
  status,
  message,
}: ActionFeedbackProps) {
  if (status === "idle" || !message) {
    return null;
  }

  return (
    <div
      className="cv-feedback"
      data-status={status}
      role={status === "error" ? "alert" : "status"}
    >
      <strong>
        {status === "pending"
          ? "处理中"
          : status === "success"
            ? "已完成"
            : "处理失败"}
      </strong>
      <span>{message}</span>
    </div>
  );
}
