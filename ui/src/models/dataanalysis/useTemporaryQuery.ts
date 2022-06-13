import useRequest from "@/hooks/useRequest/useRequest";
import dataAnalysis from "@/services/dataAnalysis";
import { useState } from "react";

const useTemporaryQuery = () => {
  const [visibleFolder, steVisibleFolder] = useState<boolean>(false);

  const changeVisibleFolder = (flag: boolean) => {
    steVisibleFolder(flag);
  };

  const doFolderList = useRequest(dataAnalysis.getFolderList, {
    loadingText: false,
  });

  const doCreatedFolder = useRequest(dataAnalysis.createdFolder, {
    loadingText: false,
  });

  const doDeleteFolder = useRequest(dataAnalysis.deleteFolder, {
    loadingText: false,
  });

  const doUpdateFolder = useRequest(dataAnalysis.updateFolder, {
    loadingText: false,
  });

  return {
    visibleFolder,
    changeVisibleFolder,

    doFolderList,
    doCreatedFolder,
    doDeleteFolder,
    doUpdateFolder,
  };
};
export default useTemporaryQuery;
