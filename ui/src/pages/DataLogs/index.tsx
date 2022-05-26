import dataLogsStyles from "@/pages/DataLogs/styles/index.less";
import DataSourceMenu from "@/pages/DataLogs/components/DataSourceMenu";
import SelectedDataBaseDraw from "@/pages/DataLogs/components/SelectedDatabaseDraw";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { useModel } from "@@/plugin-model/useModel";
import RawLogTabs from "@/pages/DataLogs/components/RawLogTabs";
import BreadCrumbs from "@/components/BreadCrumbs";
import { logLibraryInfoType } from "@/components/BreadCrumbs/type";
import useLogUrlParams from "@/pages/DataLogs/hooks/useLogUrlParams";
import useUrlState from "@ahooksjs/use-url-state";

const DataLogs = () => {
  const [urlState] = useUrlState();
  const [logLibraryInfo, setLogLibrary] = useState<logLibraryInfoType>({});
  const {
    onChangeCurrentDatabase,
    onChangeVisibleDatabaseDraw,
    // onChangeLogPanes,
    currentDatabase,
    currentLogLibrary,
    doGetLogLibrary,
    logPanesHelper,
  } = useModel("dataLogs");
  useLogUrlParams();
  useEffect(() => {
    return () => {
      onChangeVisibleDatabaseDraw(false);
      onChangeCurrentDatabase(undefined);
      logPanesHelper.resetPane();
    };
  }, []);
  useEffect(() => {
    console.log(currentDatabase, currentLogLibrary);
    const obj = {
      instanceName:
        currentDatabase?.instanceDesc || currentDatabase?.instanceName,
      databaseName: currentDatabase?.desc || currentDatabase?.name,
      tableName: currentLogLibrary?.desc || currentLogLibrary?.tableName,
      tid: currentLogLibrary?.id,
      did: currentDatabase?.id,
    };
    setLogLibrary(obj);
  }, [currentDatabase, currentLogLibrary]);

  useEffect(() => {
    const tid = urlState?.tid;
    if (!tid) return;

    doGetLogLibrary.run(urlState.tid).then((res) => {
      if (res?.code !== 0) {
        return;
      }
      console.log(res.data);

      // handleResponse(res, tid);
    });
  }, [urlState.tid]);

  return (
    <div
      className={classNames(
        dataLogsStyles.dataLogsMain,
        dataLogsStyles.siteDrawerInCurrentWrapper,
        dataLogsStyles.menuBtnMain
      )}
      style={{ paddingTop: currentDatabase?.instanceName ? "40px" : "10px" }}
    >
      <BreadCrumbs
        logLibraryInfo={logLibraryInfo}
        style={{ position: "absolute", top: "6px" }}
      />
      <DataSourceMenu />
      <RawLogTabs />
      <SelectedDataBaseDraw />
    </div>
  );
};
export default DataLogs;
