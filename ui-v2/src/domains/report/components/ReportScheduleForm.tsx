import { useEffect, useState } from "react";
import ChannelSelector from "./ChannelSelector";
import type {
  ReportPushChannel,
  ReportScheduleConfig
} from "../types/contracts";

const cronPresets = [
  { key: "", label: "手动填写", cron: "" },
  { key: "daily-930", label: "每天早上 9:30", cron: "0 30 9 * * *" },
  { key: "weekly-mon-930", label: "每周一早上 9:30", cron: "0 30 9 * * 1" },
  { key: "weekday-930", label: "工作日早上 9:30", cron: "0 30 9 * * 1-5" }
] as const;

type CronPresetKey = (typeof cronPresets)[number]["key"];

function findPresetKey(cron: string): CronPresetKey {
  return cronPresets.find((preset) => preset.cron === cron)?.key ?? "";
}

interface ReportScheduleFormProps {
  initialValue: ReportScheduleConfig;
  channels: ReportPushChannel[];
  isSubmitting?: boolean;
  onSubmit: (payload: ReportScheduleConfig) => void | Promise<void>;
}

export default function ReportScheduleForm({
  initialValue,
  channels,
  isSubmitting = false,
  onSubmit
}: ReportScheduleFormProps) {
  const [cron, setCron] = useState(initialValue.cron);
  const [presetKey, setPresetKey] = useState(findPresetKey(initialValue.cron));
  const [channelIds, setChannelIds] = useState(initialValue.channelIds);

  useEffect(() => {
    setCron(initialValue.cron);
    setPresetKey(findPresetKey(initialValue.cron));
    setChannelIds(initialValue.channelIds);
  }, [initialValue]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void onSubmit({
      ...initialValue,
      cron,
      channelIds
    });
  }

  return (
    <form onSubmit={handleSubmit} className="cv-form-grid">
      <div className="cv-form-two-up">
        <label className="cv-form-row">
          <span className="cv-label">常用计划</span>
          <select
            aria-label="常用计划"
            value={presetKey}
            className="cv-input"
            disabled={isSubmitting}
            onChange={(event) => {
              const nextPresetKey = event.target.value as CronPresetKey;
              setPresetKey(nextPresetKey);
              const nextPreset = cronPresets.find((preset) => preset.key === nextPresetKey);
              if (nextPreset && nextPreset.cron) {
                setCron(nextPreset.cron);
              }
            }}
          >
            {cronPresets.map((preset) => (
              <option key={preset.key || "custom"} value={preset.key}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <label className="cv-form-row">
          <span className="cv-label">Cron</span>
          <input
            aria-label="Cron"
            name="cron"
            value={cron}
            className="cv-input"
            disabled={isSubmitting}
            onChange={(event) => {
              const nextCron = event.target.value;
              setCron(nextCron);
              setPresetKey(findPresetKey(nextCron));
            }}
          />
        </label>
      </div>
      <ChannelSelector
        channels={channels}
        selectedChannelIds={channelIds}
        disabled={isSubmitting}
        onChange={setChannelIds}
      />
      <button type="submit" disabled={isSubmitting} className="cv-action-button">
        {isSubmitting ? "保存中..." : "保存报表调度"}
      </button>
    </form>
  );
}
