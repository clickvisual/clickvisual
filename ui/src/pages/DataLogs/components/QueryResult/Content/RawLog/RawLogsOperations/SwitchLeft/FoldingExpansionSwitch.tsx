import { Space, Switch } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import switchStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/index.less";
import { PaneType } from "@/models/datalogs/types";

const FoldingExpansionSwitch = ({
  oldPane,
}: {
  oldPane: PaneType | undefined;
}) => {
  const { logPanesHelper } = useModel("dataLogs");
  const { updateLogPane, logPanes } = logPanesHelper;

  const handleChangeFoldingExpansionChecked = () => {
    if (!oldPane) return;
    updateLogPane(
      oldPane.paneId,
      { ...oldPane, foldingChecked: !oldPane?.foldingChecked },
      logPanes
    );
  };

  const i18n = useIntl();
  return (
    <Space>
      <Switch
        checked={oldPane?.foldingChecked ?? true}
        onChange={handleChangeFoldingExpansionChecked}
        size={"small"}
      />
      <span
        className={switchStyles.title}
        onClick={handleChangeFoldingExpansionChecked}
      >
        {i18n.formatMessage({
          id: "log.switch.unfold",
        })}
      </span>
    </Space>
  );
};

export default FoldingExpansionSwitch;
