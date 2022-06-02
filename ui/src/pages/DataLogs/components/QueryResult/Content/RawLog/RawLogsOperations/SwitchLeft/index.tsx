import { Space, Switch } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import switchStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/index.less";
import { useMemo } from "react";

const HistogramSwitch = () => {
  const { currentLogLibrary, logPanesHelper, doGetHighCharts } =
    useModel("dataLogs");
  const { updateLogPane, logPanes } = logPanesHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

  const handleChangeHistogramChecked = () => {
    if (!oldPane) return;
    if (!oldPane.histogramChecked) {
      doGetHighCharts().then((res) => {
        oldPane.highCharts = res?.highCharts;
      });
    }
    updateLogPane(
      oldPane.paneId,
      { ...oldPane, histogramChecked: !oldPane?.histogramChecked },
      logPanes
    );
  };

  const i18n = useIntl();
  return (
    <Space>
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
    </Space>
  );
};
export default HistogramSwitch;
