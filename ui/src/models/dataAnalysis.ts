import useRequest from "@/hooks/useRequest/useRequest";
import systemApi from "@/services/systemSetting";
import dataLogsApi from "@/services/dataLogs";
import useRealTimeTraffic from "@/models/dataanalysis/useRealTimeTraffic";
import { useState } from "react";

const DataAnalysis = () => {
  const [navKey, setNavKey] = useState<string>("RealTimeTrafficFlow");

  const onChangeNavKey = (key: string) => {
    setNavKey(key);
  };

  const realTimeTraffic = useRealTimeTraffic();

  const doGetInstance = useRequest(systemApi.getInstances, {
    loadingText: false,
  });

  const doGetDatabase = useRequest(dataLogsApi.getDatabaseList, {
    loadingText: false,
  });

  const doGetTables = useRequest(dataLogsApi.getTableList, {
    loadingText: false,
  });

  return {
    navKey,
    onChangeNavKey,

    realTimeTraffic,
    doGetInstance,
    doGetDatabase,
    doGetTables,
  };
};

export default DataAnalysis;
