import { useState } from "react";
import type {
  AiServiceMode,
  StructuredAiCardConfig,
  StructuredAiAction,
} from "../types/moduleWorkspace";

type StructuredAiActionCardProps = {
  config: StructuredAiCardConfig;
  serviceMode: AiServiceMode;
};

type AiActionStatus = "idle" | "pending" | "success" | "error";

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildNotice(
  status: AiActionStatus,
  action: StructuredAiAction | null,
  config: StructuredAiCardConfig,
  serviceMode: AiServiceMode
) {
  if (status === "idle" || !action) {
    return null;
  }

  if (status === "pending") {
    return {
      status,
      message: `正在执行「${action.label}」...`,
    };
  }

  if (serviceMode === "disabled") {
    return {
      status: "error" as const,
      message: config.disabledHint,
    };
  }

  if (status === "error") {
    return {
      status,
      message:
        serviceMode === "failing"
          ? config.degradedHint
          : action.failureMessage,
    };
  }

  return {
    status,
    message: action.successMessage,
  };
}

export default function StructuredAiActionCard({
  config,
  serviceMode,
}: StructuredAiActionCardProps) {
  const [status, setStatus] = useState<AiActionStatus>("idle");
  const [activeAction, setActiveAction] = useState<StructuredAiAction | null>(
    null
  );

  async function handleRun(action: StructuredAiAction) {
    if (serviceMode === "disabled") {
      setActiveAction(action);
      setStatus("error");
      return;
    }

    setActiveAction(action);
    setStatus("pending");
    await delay(560);
    setStatus(serviceMode === "failing" ? "error" : "success");
  }

  const notice = buildNotice(status, activeAction, config, serviceMode);

  return (
    <section className="cv-ai-card">
      <div className="cv-ai-card__header">
        <div>
          <p className="cv-ai-card__eyebrow">AI Actions</p>
          <h2 className="cv-ai-card__title">{config.title}</h2>
        </div>
        <span className="cv-ai-card__badge" data-mode={serviceMode}>
          {serviceMode === "ready"
            ? "服务正常"
            : serviceMode === "failing"
              ? "服务失败"
              : "服务禁用"}
        </span>
      </div>
      <p className="cv-ai-card__description">{config.description}</p>
      {notice ? (
        <div
          className="cv-feedback"
          data-status={notice.status}
          role={notice.status === "error" ? "alert" : "status"}
        >
          <strong>
            {notice.status === "pending"
              ? "AI 执行中"
              : notice.status === "success"
                ? "AI 已返回"
                : "AI 不可用"}
          </strong>
          <span>{notice.message}</span>
        </div>
      ) : null}
      <div className="cv-ai-card__actions">
        {config.actions.map((action) => (
          <article key={action.id} className="cv-ai-card__action">
            <div>
              <h3>{action.label}</h3>
              <p>{action.description}</p>
            </div>
            <button
              type="button"
              className="cv-ai-card__button"
              onClick={() => void handleRun(action)}
              disabled={status === "pending" || serviceMode === "disabled"}
            >
              执行动作
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
