import LoggingLibraryStyles from "@/pages/DataLogs/components/DataSourceMenu/LoggingLibrary/index.less";
import SearchLogLibrary from "@/pages/DataLogs/components/DataSourceMenu/SearchLogLibrary";
import LogLibraryList from "@/pages/DataLogs/components/DataSourceMenu/LogLibraryList";
import CreatedDatabaseModal from "@/pages/DataLogs/components/SelectedDatabaseDraw/CreatedDatabaseModal";
import ModalCreatedLogLibrary from "@/pages/DataLogs/components/DataSourceMenu/ModalCreatedLogLibrary";
import { useEffect, useMemo, useState } from "react";
import { useModel } from "umi";
import { cloneDeep } from "lodash";

const LoggingLibrary = (props: { instanceTree: any; onGetList: any }) => {
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
      ) : null}
      <CreatedDatabaseModal onGetList={onGetList} />
      <ModalCreatedLogLibrary onGetList={onGetList} />
    </div>
  );
};
export default LoggingLibrary;
