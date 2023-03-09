import CollapseMenu from "@/pages/DataLogs/components/CollapseAndExpandMenu/CollapseMenu";
import DataSourceMenu from "@/pages/DataLogs/components/DataSourceMenu";
import RawLogTabs from "@/pages/DataLogs/components/RawLogTabs";
import useLogUrlParams from "@/pages/DataLogs/hooks/useLogUrlParams";
import dataLogsStyles from "@/pages/DataLogs/styles/index.less";
import { useModel } from "@umijs/max";
import classNames from "classnames";
import { useEffect } from "react";

const DataLogs = () => {
  const { logPanesHelper } = useModel("dataLogs");
  const { onChangeIsTidInitialize } = useModel("instances");
  useLogUrlParams();

  useEffect(() => {
    return () => {
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
