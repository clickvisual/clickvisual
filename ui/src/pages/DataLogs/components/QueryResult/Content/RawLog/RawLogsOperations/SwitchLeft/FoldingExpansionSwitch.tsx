import { Space, Switch } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import switchStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/index.less";
import { useMemo } from "react";

const FoldingExpansionSwitch = () => {
  const { currentLogLibrary, logPanesHelper } = useModel("dataLogs");
  const { updateLogPane, logPanes } = logPanesHelper;

  const oldPane = useMemo(() => {
    if (!currentLogLibrary?.id) return;
    return logPanes[currentLogLibrary?.id.toString()];
  }, [currentLogLibrary?.id, logPanes]);

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
          id: `log.switch.${
            oldPane?.foldingChecked ?? true ? "unfold" : "fold"
          }`,
        })}
      </span>
    </Space>
  );
};

export default FoldingExpansionSwitch;
