import { useEffect, useState } from "react";
import ChannelSelector from "./ChannelSelector";
import type {
  ReportPushChannel,
  ReportScheduleConfig
} from "../types/contracts";

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
  const [channelIds, setChannelIds] = useState(initialValue.channelIds);

  useEffect(() => {
    setCron(initialValue.cron);
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
      <label className="cv-form-row">
        <span className="cv-label">Cron</span>
        <input
          aria-label="Cron"
          name="cron"
          value={cron}
          className="cv-input"
          disabled={isSubmitting}
          onChange={(event) => setCron(event.target.value)}
        />
      </label>
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
