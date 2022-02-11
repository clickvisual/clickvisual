import { useState } from "react";
import api from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";

export default function useLogLibrary() {
  const [createdVisible, setCreatedVisible] = useState<boolean>(false);
  const [infoVisible, setInfoVisible] = useState<boolean>(false);
  const onChangeCreatedVisible = (visible: boolean) => {
    setCreatedVisible(visible);
  };
  const onChangeInfoVisible = (visible: boolean) => {
    setInfoVisible(visible);
  };

  const createdLogLibrary = useRequest(api.createdTable, {
    loadingText: false,
  });

  const deletedLogLibrary = useRequest(api.deletedTable, {
    loadingText: false,
  });
  const getLogLibrary = useRequest(api.getTableInfo, {
    loadingText: false,
  });

  return {
    logLibraryCreatedModalVisible: createdVisible,
    logLibraryInfoDrawVisible: infoVisible,
    onChangeLogLibraryCreatedModalVisible: onChangeCreatedVisible,
    onChangeLogLibraryInfoDrawVisible: onChangeInfoVisible,

    doCreatedLogLibrary: createdLogLibrary,
    doDeletedLogLibrary: deletedLogLibrary,
    doGetLogLibrary: getLogLibrary,
  };
}
