import LoggingLibraryStyles from "@/pages/DataLogs/components/DataSourceMenu/LoggingLibrary/index.less";
import SearchLogLibrary from "@/pages/DataLogs/components/DataSourceMenu/SearchLogLibrary";
import LogLibraryList from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList";
import CreatedDatabaseModal from "@/pages/DataLogs/components/SelectedDatabaseDraw/CreatedDatabaseModal";
import ModalCreatedLogLibrary from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import { useEffect, useMemo, useState } from "react";
import { useIntl, useModel } from "umi";
import { cloneDeep } from "lodash";
import { Empty } from "antd";

const LoggingLibrary = (props: { instanceTree: any; onGetList: any }) => {
  const i18n = useIntl();
  const { instanceTree, onGetList } = props;
  const [listData, setListData] = useState<any[]>(instanceTree);
  const { filterSelectedTree } = useModel("instances");

  let cloneList = useMemo(() => {
    return cloneDeep(instanceTree);
  }, [instanceTree]);

  const onSearch = (val: string) => {
    if (val.trim().length != 0) {
      setListData(filterSelectedTree(cloneList, val));
      return;
    }
    setListData(cloneList);
  };

  useEffect(() => {
    setListData(instanceTree);
  }, [instanceTree]);

  return (
    <div className={LoggingLibraryStyles.loggingLibraryMain}>
      <SearchLogLibrary onSearch={onSearch} onGetList={onGetList} />
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
      <CreatedDatabaseModal onGetList={onGetList} />
      <ModalCreatedLogLibrary onGetList={onGetList} />
    </div>
  );
};
export default LoggingLibrary;
