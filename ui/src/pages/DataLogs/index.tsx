import dataLogsStyles from "@/pages/DataLogs/styles/index.less";
import DataSourceMenu from "@/pages/DataLogs/components/DataSourceMenu";
import SelectedDataBaseDraw from "@/pages/DataLogs/components/SelectedDatabaseDraw";
import classNames from "classnames";
import { useEffect } from "react";
import { useModel } from "@@/plugin-model/useModel";
import RawLogTabs from "@/pages/DataLogs/components/RawLogTabs";
import ManageIndexModal from "@/pages/DataLogs/components/RawLogsIndexes/ManageIndexModal";

const DataLogs = () => {
  const { onChangeCurrentDatabase, onChangeVisibleDatabaseDraw } =
    useModel("dataLogs");

  useEffect(() => {
    return () => {
      onChangeVisibleDatabaseDraw(false);
      onChangeCurrentDatabase(undefined);
    };
  }, []);

  return (
    <div
      className={classNames(
        dataLogsStyles.dataLogsMain,
        dataLogsStyles.siteDrawerInCurrentWrapper
      )}
    >
      <DataSourceMenu />
      <SelectedDataBaseDraw />
      <RawLogTabs />
      <ManageIndexModal />
    </div>
  );
};
export default DataLogs;
