import { HighCharts } from "@/services/dataLogs";
import highChartsStyles from "@/pages/DataLogs/components/HighCharts/index.less";
import { IntlShape } from "react-intl";

type HighChartsTooltipProps = {
  data: HighCharts;
  format: (timeStr: string | number, formatType: string) => string;
  i18n: IntlShape;
};
const HighChartsTooltip = (props: HighChartsTooltipProps) => {
  const { i18n, data, format } = props;

  return (
    <div className={highChartsStyles.highCartToolTip}>
      <div>
        <span>
          {i18n.formatMessage({ id: "log.highChart.tooltip.startTime" })}
        </span>
        <span>{format(data.from, "YYYY-MM-DD HH:mm:ss")}</span>
      </div>
      <div>
        <span>
          {i18n.formatMessage({ id: "log.highChart.tooltip.endTime" })}
        </span>
        <span>{format(data.to, "YYYY-MM-DD HH:mm:ss")}</span>
      </div>
      <div>
        <span>{i18n.formatMessage({ id: "log.highChart.tooltip.num" })}</span>
        <span>{data.count}</span>
      </div>
      <div style={{ color: "hsl(21, 85%, 56%)" }}>
        <span>
          {i18n.formatMessage({ id: "log.highChart.tooltip.prompt" })}
        </span>
      </div>
    </div>
  );
};
export default HighChartsTooltip;
