import { PaneType } from "@/models/datalogs/types";
import switchStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/index.less";
import { useModel } from "@umijs/max";
import { Switch } from "antd";
import { useIntl } from "umi";

const HistogramSwitch = ({ oldPane }: { oldPane: PaneType | undefined }) => {
  const { logPanesHelper, doGetHighCharts } = useModel("dataLogs");
  const { updateLogPane, logPanes } = logPanesHelper;

  const handleChangeHistogramChecked = async () => {
    if (!oldPane) return;
    if (!oldPane.histogramChecked) {
      const res = await doGetHighCharts();
      oldPane.highCharts = res?.highCharts;
    } else {
      // oldPane.highCharts = { count: 0, progress: "", histograms: [] };
      oldPane.highCharts = {
        ...oldPane.highCharts,
        progress: "",
        histograms: [],
      };
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
