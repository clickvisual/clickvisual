import { useState } from "react";

export type AiActionMode = "ready" | "error" | "disabled";

export type AiActionItem = {
  id: string;
  label: string;
  successMessage: string;
  errorMessage: string;
};

interface AiActionPanelProps {
  title?: string;
  description?: string;
  actions: AiActionItem[];
  mode?: AiActionMode;
}

export default function AiActionPanel({
  title = "AI 动作",
  description,
  actions,
  mode = "ready"
}: AiActionPanelProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("尚未触发 AI 动作");

  async function handleAction(action: AiActionItem) {
    if (mode === "disabled") {
      return;
    }

    setStatus("pending");
    setMessage(`AI 正在执行：${action.label}`);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 180);
    });

    if (mode === "error") {
      setStatus("error");
      setMessage(action.errorMessage);
      return;
    }

    setStatus("success");
    setMessage(action.successMessage);
  }

  const role = status === "error" ? "alert" : "status";
  const className =
    status === "error"
      ? "cv-status-card"
      : status === "success" || status === "pending"
        ? "cv-status-card"
        : "cv-status-card";

  return (
    <div className="cv-section-stack">
      <div className="cv-panel-header" style={{ marginBottom: 0 }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {description ? <p className="cv-panel-description">{description}</p> : null}
        </div>
        {mode === "disabled" ? <span className="cv-pill">AI 不可用</span> : null}
      </div>
      <div className="cv-inline-actions">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="cv-secondary-button"
            disabled={mode === "disabled" || status === "pending"}
            onClick={() => void handleAction(action)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className={className} role={role}>
        {mode === "disabled"
          ? "AI 服务暂不可用，页面保留手动操作能力。"
          : message}
      </div>
    </div>
  );
}
