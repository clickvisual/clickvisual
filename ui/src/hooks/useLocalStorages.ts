import { UrlStateType } from "@/pages/DataLogs/hooks/useLogUrlParams";

interface FoldLogStorageType {
  tid: string;
  flag: boolean;
}

export interface LastDataLogsStateType extends UrlStateType {}

const useLocalStorages = () => {
  const getCurrentFoldLogFlag = (tid: string) => {
    const foldLogStorages: FoldLogStorageType[] = JSON.parse(
      localStorage.getItem("fold-log-flag") || "[]"
    );
    return foldLogStorages.find((item: any) => item.tid === tid);
  };

  const onChangeFoldLogStorage = (foldFlag: FoldLogStorageType) => {
    const foldLogStorages: FoldLogStorageType[] = JSON.parse(
      localStorage.getItem("fold-log-flag") || "[]"
    );
    const currentIndex = foldLogStorages.findIndex(
      (item: any) => item.tid === foldFlag.tid
    );
    if (currentIndex > -1) {
      foldLogStorages[currentIndex].flag = foldFlag.flag;
    } else {
      foldLogStorages.push(foldFlag);
    }
    localStorage.setItem("fold-log-flag", JSON.stringify(foldLogStorages));
  };

  const getLastDataLogsState = () => {
    const lastDataLogsState: LastDataLogsStateType = JSON.parse(
      localStorage.getItem("last-datalogs-state") || "[]"
    );
    return lastDataLogsState;
  };

  const onChangeDataLogsState = (value: LastDataLogsStateType) => {
    localStorage.setItem("last-datalogs-state", JSON.stringify(value));
  };

  return {
    getCurrentFoldLogFlag,
    onChangeFoldLogStorage,
    getLastDataLogsState,
    onChangeDataLogsState,
  };
};
export default useLocalStorages;
