import useRequest from "@/hooks/useRequest/useRequest";
import systemApi from "@/services/systemSetting";
import dataLogsApi from "@/services/dataLogs";
import useRealTimeTraffic from "@/models/dataanalysis/useRealTimeTraffic";

const DataAnalysis = () => {
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
    realTimeTraffic,
    doGetInstance,
    doGetDatabase,
    doGetTables,
  };
};

export default DataAnalysis;
