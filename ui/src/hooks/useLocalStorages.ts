import { UrlStateType } from "@/pages/DataLogs/hooks/useLogUrlParams";

interface FoldLogStorageType {
  tid: string;
  flag: boolean;
}

export enum LocalModuleType {
  dataLogs = "data-Logs",
  dataAnalysis = "data-analysis",
  datalogsQuerySql = "datalogs-query-sql",
  dataAnalysisOpenNodeId = "data-analysis-open-node-id",
}

export interface LastDataLogsStateType extends UrlStateType {
  querySql?: any;
}

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

  const onSetLocalData = (value: any, moduleName: string) => {
    try {
      let AllClickHouse = JSON.parse(
        localStorage.getItem("click-house") || JSON.stringify({})
      );
      let oldClickHouse = AllClickHouse[moduleName] || {};
      if (value === undefined) {
        return oldClickHouse;
      }
      if (value === null) {
        AllClickHouse[moduleName] = undefined;
        localStorage.setItem("click-house", JSON.stringify(AllClickHouse));
        return true;
      }
      const newClickHouse = value;
      const newKeys = Object.keys(newClickHouse);
      const oldKeys = Object.keys(oldClickHouse);
      let returnObj = {};
      let isChange: boolean = false;
      newKeys.map((item: any) => {
        // ?????????key???????????????????????????local??????????????????
        if (!oldKeys.includes(item)) {
          oldClickHouse[item] = newClickHouse[item];
          isChange = true;
          returnObj[item] = newClickHouse[item];
          return;
        }
        // ??????key?????? ?????????local??????????????????????????????
        if (newClickHouse[item] !== undefined) {
          // ??????????????????
          if (newClickHouse[item] == oldClickHouse[item]) {
            returnObj[item] = newClickHouse[item];
            return;
          }
          oldClickHouse[item] = newClickHouse[item];
          isChange = true;
          returnObj[item] = newClickHouse[item];
          return;
        }
        // ????????????key???value???undefined????????????local????????????????????????
        returnObj[item] = oldClickHouse[item];
      });
      AllClickHouse[moduleName] = oldClickHouse;
      isChange &&
        localStorage.setItem("click-house", JSON.stringify(AllClickHouse));
      return returnObj;
    } catch (e) {
      console.error("localaStorage?????????onSetLocalData????????????????????????");
      return false;
    }
  };

  return {
    getCurrentFoldLogFlag,
    onChangeFoldLogStorage,
    getLastDataLogsState,
    onChangeDataLogsState,
    onSetLocalData,
  };
};
export default useLocalStorages;
