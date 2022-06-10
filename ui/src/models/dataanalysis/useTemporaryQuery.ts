import useRequest from "@/hooks/useRequest/useRequest";
import dataAnalysis from "@/services/dataAnalysis";

const useTemporaryQuery = () => {
  const doFolderList = useRequest(dataAnalysis.getFolderList, {
    loadingText: false,
  });

  return {
    doFolderList,
  };
};
export default useTemporaryQuery;
