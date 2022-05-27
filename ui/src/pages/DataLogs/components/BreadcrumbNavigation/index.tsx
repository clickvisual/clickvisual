import { Button, Tooltip } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import { useIntl, useModel } from "umi";
import BreadCrumbs from "@/components/BreadCrumbs";
import { logLibraryInfoType } from "@/components/BreadCrumbs/type";
import { useEffect, useState } from "react";
import dataLogsStyles from "@/pages/DataLogs/styles/index.less";

const BreadcrumbNavigation = () => {
  const i18n = useIntl();
  const [logLibraryInfo, setLogLibrary] = useState<logLibraryInfoType>({});
  const { onChangeVisibleDatabaseDraw, currentDatabase, currentLogLibrary } =
    useModel("dataLogs");

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
    <div className={dataLogsStyles.BreadcrumbNav}>
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
  );
};
export default BreadcrumbNavigation;
