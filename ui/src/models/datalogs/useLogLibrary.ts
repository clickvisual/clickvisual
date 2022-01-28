import { useState } from "react";
import api from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";

export default function useLogLibrary() {
  const [createdVisible, setCreatedVisible] = useState<boolean>(false);
  const onChangeCreatedVisible = (visible: boolean) => {
    setCreatedVisible(visible);
  };
  const createdLogLibrary = useRequest(api.createdTable, {
    loadingText: false,
  });

  const deletedLogLibrary = useRequest(api.deletedTable, {
    loadingText: false,
  });

  return {
    logLibraryCreatedModalVisible: createdVisible,
    onChangeLogLibraryCreatedModalVisible: onChangeCreatedVisible,

    doCreatedLogLibrary: createdLogLibrary,
    doDeletedLogLibrary: deletedLogLibrary,
  };
}
