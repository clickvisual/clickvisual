import { UrlStateType } from "@/pages/DataLogs/hooks/useLogUrlParams";

interface FoldLogStorageType {
  tid: string;
  flag: boolean;
}

export enum LocalModuleType {
  dataLogs = "data-Logs",
  dataAnalysis = "data-analysis",
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

  const onSetLocalData = (value: any, moduleName: string) => {
    try {
      let AllClickHouse = JSON.parse(
        localStorage.getItem("click-house") || JSON.stringify({})
      );
      let oldClickHouse = AllClickHouse[moduleName] || {};
      console.log(oldClickHouse, "oldClickHouse");

      const newClickHouse = value;
      const newKeys = Object.keys(newClickHouse);
      const oldKeys = Object.keys(oldClickHouse);
      console.log("old", oldClickHouse);
      let returnObj = {};
      let isChange: boolean = false;
      newKeys.map((item: any) => {
        // 如果该key不存在，则直接写入local里并返回该值
        if (!oldKeys.includes(item)) {
          oldClickHouse[item] = newClickHouse[item];
          isChange = true;
          returnObj[item] = newClickHouse[item];
          return;
        }
        // 如果key存在 则对比local和传入的值的新旧关系
        if (newClickHouse[item] !== undefined) {
          // 相同则不处理
          if (newClickHouse[item] == oldClickHouse[item]) {
            returnObj[item] = newClickHouse[item];
            return;
          }
          oldClickHouse[item] = newClickHouse[item];
          isChange = true;
          returnObj[item] = newClickHouse[item];
          return;
        }
        // 当且仅当key的value为undefined时才会取local里的值当做返回值
        returnObj[item] = oldClickHouse[item];
      });
      AllClickHouse[moduleName] = oldClickHouse;
      isChange &&
        localStorage.setItem("click-house", JSON.stringify(AllClickHouse));
      console.log("new", oldClickHouse, returnObj, AllClickHouse);

      return returnObj;
    } catch (e) {
      console.error("localaStorage存取的onSetLocalData函数内部执行出错");
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
