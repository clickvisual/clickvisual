import type { IngestionStep } from "../../types/contracts";

const stepLabels: Record<IngestionStep, string> = {
  source: "来源选择",
  detect: "样本与识别",
  normalize: "解析确认",
  fields: "查询字段",
  publish: "发布预览"
};

interface IngestionStepNavProps {
  steps: IngestionStep[];
  currentStep: IngestionStep;
  onSelect: (step: IngestionStep) => void;
}

export function IngestionStepNav({ steps, currentStep, onSelect }: IngestionStepNavProps) {
  return (
    <nav className="cv-ingestion-nav" aria-label="接入步骤">
      {steps.map((step, index) => (
        <button
          key={step}
          type="button"
          className={`cv-ingestion-nav__item${step === currentStep ? " cv-ingestion-nav__item--active" : ""}`}
          onClick={() => onSelect(step)}
        >
          <span className="cv-ingestion-nav__index">{index + 1}</span>
          <span>{stepLabels[step]}</span>
        </button>
      ))}
    </nav>
  );
}
