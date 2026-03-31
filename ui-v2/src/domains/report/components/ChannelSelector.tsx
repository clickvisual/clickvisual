import type { ReportPushChannel } from "../types/contracts";

interface ChannelSelectorProps {
  channels: ReportPushChannel[];
  selectedChannelIds: number[];
  disabled?: boolean;
  onChange: (nextIds: number[]) => void;
}

export default function ChannelSelector({
  channels,
  selectedChannelIds,
  disabled = false,
  onChange
}: ChannelSelectorProps) {
  function toggleChannel(channelId: number) {
    const nextIds = selectedChannelIds.includes(channelId)
      ? selectedChannelIds.filter((id) => id !== channelId)
      : [...selectedChannelIds, channelId];

    onChange(nextIds);
  }

  return (
    <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
      <legend className="cv-label">钉钉渠道</legend>
      <div className="cv-checkbox-list" style={{ marginTop: 12 }}>
        {channels.map((channel) => (
          <label key={channel.id} className="cv-checkbox-card">
            <input
              type="checkbox"
              aria-label={channel.name}
              checked={selectedChannelIds.includes(channel.id)}
              disabled={disabled}
              onChange={() => toggleChannel(channel.id)}
            />
            <span>
              <strong>{channel.name}</strong>
              <span className="cv-muted" style={{ display: "block", marginTop: 4 }}>
                渠道标识：{channel.key}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
