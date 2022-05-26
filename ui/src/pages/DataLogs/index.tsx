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
import { Button, Tooltip } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import { useIntl } from "umi";

const DataLogs = () => {
  const [logLibraryInfo, setLogLibrary] = useState<logLibraryInfoType>({});
  const i18n = useIntl();
  const {
    onChangeCurrentDatabase,
    onChangeVisibleDatabaseDraw,
    // onChangeLogPanes,
    currentDatabase,
    currentLogLibrary,
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
    const obj = {
      instanceName: currentDatabase?.instanceName,
      instanceDesc: currentDatabase?.instanceDesc,
      databaseDesc: currentDatabase?.desc,
      databaseName: currentDatabase?.name,
      tableDesc: currentLogLibrary?.desc,
      tableName: currentLogLibrary?.tableName,
      tid: currentLogLibrary?.id,
      did: currentDatabase?.id,
    };
    setLogLibrary(obj);
  }, [currentDatabase, currentLogLibrary]);

  /* todo delete */
  // useEffect(() => {
  //   const tid = urlState?.tid;
  //   if (!tid) return;

  //   doGetLogLibrary.run(urlState.tid).then((res) => {
  //     if (res?.code !== 0) {
  //       return;
  //     }
  //     console.log(res.data);
  //     const data: any = res.data;
  //     const obj = {
  //       instanceName: data.database.instanceName,
  //       instanceDesc: data.database.instanceDesc,
  //       databaseDesc: data.database.desc,
  //       databaseName: data.database.name,
  //       tableDesc: data.desc,
  //       tableName: data.name,
  //       tid: urlState.tid,
  //       did: data.database.id,
  //     };
  //     console.log(obj, "onnnijj");

  //     setLogLibrary(obj);
  //     // handleResponse(res, tid);
  //   });
  // }, [urlState.tid]);

  return (
    <div
      className={classNames(
        dataLogsStyles.dataLogsMain,
        dataLogsStyles.siteDrawerInCurrentWrapper,
        dataLogsStyles.menuBtnMain
      )}
    >
      {/* todo components */}
      <div style={{ position: "absolute", top: "6px", display: "flex" }}>
        <div className={dataLogsStyles.selectedBtn}>
          <Button
            onClick={() => onChangeVisibleDatabaseDraw(true)}
            type={"link"}
            icon={
              <Tooltip
                title={i18n.formatMessage({ id: "datasource.header.switch" })}
              >
                <AppstoreOutlined />
              </Tooltip>
            }
          />
        </div>
        <BreadCrumbs logLibraryInfo={logLibraryInfo} />
      </div>
      <DataSourceMenu />
      <RawLogTabs />
      <SelectedDataBaseDraw />
    </div>
  );
};
export default DataLogs;
