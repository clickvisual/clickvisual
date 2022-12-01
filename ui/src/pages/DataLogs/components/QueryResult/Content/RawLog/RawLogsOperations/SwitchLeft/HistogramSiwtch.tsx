import { Switch } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import switchStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/index.less";
import { PaneType } from "@/models/datalogs/types";

const HistogramSwitch = ({ oldPane }: { oldPane: PaneType | undefined }) => {
  const { logPanesHelper, doGetHighCharts } = useModel("dataLogs");
  const { updateLogPane, logPanes } = logPanesHelper;

  const handleChangeHistogramChecked = () => {
    if (!oldPane) return;
    if (!oldPane.histogramChecked) {
      doGetHighCharts().then((res) => {
        oldPane.highCharts = res?.highCharts;
      });
    } else {
      oldPane.highCharts = { count: 0, progress: "", histograms: [] };
    }
    updateLogPane(
      oldPane.paneId,
      { ...oldPane, histogramChecked: !oldPane?.histogramChecked },
      logPanes
    );
  };

  const i18n = useIntl();
  return (
    <>
      <Switch
        checked={oldPane?.histogramChecked ?? true}
        onChange={handleChangeHistogramChecked}
        size={"small"}
      />
      <span
        className={switchStyles.title}
        onClick={handleChangeHistogramChecked}
      >
        {i18n.formatMessage({ id: "log.switch.histogram" })}
      </span>
    </>
  );
};
export default HistogramSwitch;
