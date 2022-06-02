import { Space, Switch } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import dataLogsStyles from "@/pages/DataLogs/styles/index.less";

const NvaRight = () => {
  const { logSwitchHelper } = useModel("dataLogs");
  const { histogramChecked, handleChangeHistogramChecked } = logSwitchHelper;
  const i18n = useIntl();
  return (
    <Space>
      <Switch
        checked={histogramChecked}
        onChange={() => handleChangeHistogramChecked(!histogramChecked)}
        size={"small"}
      />
      <span
        className={dataLogsStyles.title}
        onClick={() => handleChangeHistogramChecked(!histogramChecked)}
      >
        {i18n.formatMessage({ id: "log.switch.histogram" })}
      </span>
    </Space>
  );
};
export default NvaRight;
