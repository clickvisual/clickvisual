import { HighCharts } from "@/services/dataLogs";
import highChartsStyles from "@/pages/DataLogs/components/HighCharts/index.less";

type HighChartsTooltipProps = {
  data: HighCharts;
  format: (timeStr: string | number, formatType: string) => string;
};
const HighChartsTooltip = (props: HighChartsTooltipProps) => {
  const { data, format } = props;

  return (
    <div className={highChartsStyles.highCartToolTip}>
      <div>
        <span>开始时间：</span>
        <span>{format(data.from, "YYYY-MM-DD HH:mm:ss")}</span>
      </div>
      <div>
        <span>结束时间：</span>
        <span>{format(data.to, "YYYY-MM-DD HH:mm:ss")}</span>
      </div>
      <div>
        <span>次数：</span>
        <span>{data.count}</span>
      </div>
      <div style={{ color: "hsl(21, 85%, 56%)" }}>
        <span>点击查询精确结果</span>
      </div>
    </div>
  );
};
export default HighChartsTooltip;
