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
  let cloneList = cloneDeep(instanceTree);
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

  const LogLibrary = useMemo(() => {
    if (listData.length == 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginBottom: 10 }}
          description={i18n.formatMessage({
            id: "log.index.item.empty",
          })}
        />
      );
    }

    return <LogLibraryList list={listData} onGetList={onGetList} />;
  }, [listData]);

  return (
    <div className={LoggingLibraryStyles.loggingLibraryMain}>
      <SearchLogLibrary onSearch={onSearch} onGetList={onGetList} />
      {LogLibrary}
      <CreatedDatabaseModal onGetList={onGetList} />
      <ModalCreatedLogLibrary onGetList={onGetList} />
    </div>
  );
};
export default LoggingLibrary;
