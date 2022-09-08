import { useState } from "react";
import api from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";

export default function useLogLibrary() {
  const [createdVisible, setCreatedVisible] = useState<boolean>(false);
  const [infoVisible, setInfoVisible] = useState<boolean>(false);
  const [isAccessLogLibrary, setIsAccessLogLibrary] = useState<boolean>(false);
  const [isLogLibraryAllDatabase, setIsLogLibraryAllDatabase] =
    useState<boolean>(false);
  const [isEditDatabase, setIsEditDatabase] = useState<boolean>(false);
  const [currentEditDatabase, setEditCurrentDatabase] = useState<any>();

  const onChangeCurrentEditDatabase = (data: any) => {
    setEditCurrentDatabase(data);
  };

  const onChangeCreatedVisible = (visible: boolean) => {
    setCreatedVisible(visible);
  };
  const onChangeInfoVisible = (visible: boolean) => {
    setInfoVisible(visible);
  };
  const onChangeIsAccessLogLibrary = (visible: boolean) => {
    setIsAccessLogLibrary(visible);
  };
  const onChangeIsLogLibraryAllDatabase = (flag: boolean) => {
    setIsLogLibraryAllDatabase(flag);
  };
  const onChangeIsEditDatabase = (visible: boolean) => {
    setIsEditDatabase(visible);
  };

  const createdLogLibraryEachRow = useRequest(api.createdTableEachRow, {
    loadingText: false,
  });

  const createdLogLibraryAsString = useRequest(api.createdTableAsString, {
    loadingText: false,
  });

  const doGetMappingJson = useRequest(api.getMappingJson, {
    loadingText: false,
  });

  const doCreatedLocalLogLibrary = useRequest(api.createdLocalTable, {
    loadingText: false,
  });

  const doCreatedLocalLogLibraryBatch = useRequest(api.createdLocalTableBatch, {
    loadingText: false,
  });

  const deletedLogLibrary = useRequest(api.deletedTable, {
    loadingText: false,
  });
  const getLogLibrary = useRequest(api.getTableInfo, {
    loadingText: false,
  });
  const doUpdateLogLibrary = useRequest(api.updateTableInfo, {
    loadingText: false,
  });

  const getLocalTables = useRequest(api.getLocalDatabasesAndTables, {
    loadingText: false,
  });

  const getTableColumns = useRequest(api.getTableColumns, {
    loadingText: false,
  });

  return {
    logLibraryCreatedModalVisible: createdVisible,
    logLibraryInfoDrawVisible: infoVisible,
    isAccessLogLibrary,
    isEditDatabase,
    isLogLibraryAllDatabase,
    currentEditDatabase,
    onChangeLogLibraryCreatedModalVisible: onChangeCreatedVisible,
    onChangeLogLibraryInfoDrawVisible: onChangeInfoVisible,
    onChangeIsAccessLogLibrary,
    onChangeIsLogLibraryAllDatabase,
    onChangeIsEditDatabase,
    onChangeCurrentEditDatabase,

    doCreatedLogLibraryAsString: createdLogLibraryAsString,
    doCreatedLogLibraryEachRow: createdLogLibraryEachRow,
    doGetMappingJson,
    doDeletedLogLibrary: deletedLogLibrary,
    doGetLogLibrary: getLogLibrary,
    getLogLibraryLoading: getLogLibrary.loading,
    doUpdateLogLibrary,
    updateLogLibraryLoading: doUpdateLogLibrary.loading,
    getLocalTables,
    getTableColumns,
    doCreatedLocalLogLibrary,
    doCreatedLocalLogLibraryBatch,
  };
}
