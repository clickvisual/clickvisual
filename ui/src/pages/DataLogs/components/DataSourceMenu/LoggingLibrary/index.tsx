import CreatedDatabaseModal from "@/pages/DataLogs/components/DataSourceMenu/CreatedDatabaseModal";
import LoggingLibraryStyles from "@/pages/DataLogs/components/DataSourceMenu/LoggingLibrary/index.less";
import LogLibraryList from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList";
import SearchLogLibrary from "@/pages/DataLogs/components/DataSourceMenu/SearchLogLibrary";
import { Empty, Spin } from "antd";
import { cloneDeep } from "lodash";
import { useEffect, useState } from "react";
import { useIntl, useModel } from "umi";

const LoggingLibrary = (props: { instanceTree: any; onGetList: any }) => {
  const i18n = useIntl();
  const { instanceTree, onGetList } = props;
  const [listData, setListData] = useState<any[]>(instanceTree);
  const { filterSelectedTree, doGetAllInstances } = useModel("instances");

  const onSearch = (val: string) => {
    if (val.trim().length != 0) {
      const cloneList = cloneDeep(instanceTree);
      setListData(filterSelectedTree(cloneList, val));
      return;
    }
    onGetList();
  };

  useEffect(() => {
    setListData(instanceTree);
  }, [instanceTree]);

  return (
    <div className={LoggingLibraryStyles.loggingLibraryMain}>
      <SearchLogLibrary onSearch={onSearch} onGetList={onGetList} />
      <Spin
        spinning={doGetAllInstances.loading}
        tip={i18n.formatMessage({ id: "spin" })}
        className={LoggingLibraryStyles.spin}
      >
        {listData.length > 0 ? (
          <LogLibraryList list={listData} onGetList={onGetList} />
        ) : (
          <div className={LoggingLibraryStyles.flexBox}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={i18n.formatMessage({
                id: "datasource.logLibrary.noInstance",
              })}
            />
            <a href={`${process.env.PUBLIC_PATH}sys/instances`}>
              {i18n.formatMessage({ id: "datasource.logLibrary.toCreate" })}
            </a>
          </div>
        )}
      </Spin>
      <CreatedDatabaseModal onGetList={onGetList} />
    </div>
  );
};
export default LoggingLibrary;
