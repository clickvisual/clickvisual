import type {
  AiServiceMode,
  ModuleDataScenario,
  SubmitOutcome,
} from "../types/moduleWorkspace";

type MockControlPanelProps = {
  dataScenario: ModuleDataScenario;
  onDataScenarioChange: (nextValue: ModuleDataScenario) => void;
  submitOutcome: SubmitOutcome;
  onSubmitOutcomeChange: (nextValue: SubmitOutcome) => void;
  aiMode: AiServiceMode;
  onAiModeChange: (nextValue: AiServiceMode) => void;
};

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (nextValue: T) => void;
}) {
  return (
    <div className="cv-mock-panel__group">
      <span className="cv-mock-panel__label">{label}</span>
      <div className="cv-mock-panel__chips">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="cv-mock-panel__chip"
            data-active={value === option.value ? "true" : "false"}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MockControlPanel({
  dataScenario,
  onDataScenarioChange,
  submitOutcome,
  onSubmitOutcomeChange,
  aiMode,
  onAiModeChange,
}: MockControlPanelProps) {
  return (
    <section className="cv-mock-panel">
      <div>
        <p className="cv-mock-panel__eyebrow">Mock-first 演练</p>
        <h2 className="cv-mock-panel__title">统一数据态与降级开关</h2>
      </div>
      <div className="cv-mock-panel__grid">
        <ToggleGroup
          label="数据态"
          value={dataScenario}
          onChange={onDataScenarioChange}
          options={[
            { label: "正常", value: "ready" },
            { label: "加载", value: "loading" },
            { label: "空态", value: "empty" },
            { label: "错误", value: "error" },
          ]}
        />
        <ToggleGroup
          label="提交结果"
          value={submitOutcome}
          onChange={onSubmitOutcomeChange}
          options={[
            { label: "成功", value: "success" },
            { label: "失败", value: "error" },
          ]}
        />
        <ToggleGroup
          label="AI 服务"
          value={aiMode}
          onChange={onAiModeChange}
          options={[
            { label: "正常", value: "ready" },
            { label: "失败", value: "failing" },
            { label: "禁用", value: "disabled" },
          ]}
        />
      </div>
    </section>
  );
}
