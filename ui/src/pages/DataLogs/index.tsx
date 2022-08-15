import dataLogsStyles from "@/pages/DataLogs/styles/index.less";
import DataSourceMenu from "@/pages/DataLogs/components/DataSourceMenu";
import classNames from "classnames";
import { useEffect } from "react";
import { useModel } from "@@/plugin-model/useModel";
import RawLogTabs from "@/pages/DataLogs/components/RawLogTabs";
import useLogUrlParams from "@/pages/DataLogs/hooks/useLogUrlParams";
import CollapseMenu from "@/pages/DataLogs/components/CollapseAndExpandMenu/CollapseMenu";

const DataLogs = () => {
  const { onChangeVisibleDatabaseDraw, logPanesHelper } = useModel("dataLogs");
  const { onChangeIsTidInitialize } = useModel("instances");
  useLogUrlParams();

  useEffect(() => {
    return () => {
      onChangeVisibleDatabaseDraw(false);
      logPanesHelper.resetPane();
      onChangeIsTidInitialize(false);
    };
  }, []);

  return (
    <div
      className={classNames(
        dataLogsStyles.dataLogsMain,
        dataLogsStyles.siteDrawerInCurrentWrapper,
        dataLogsStyles.menuBtnMain
      )}
    >
      <DataSourceMenu />
      <RawLogTabs />
      <CollapseMenu />
    </div>
  );
};
export default DataLogs;
