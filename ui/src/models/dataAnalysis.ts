import useRequest from "@/hooks/useRequest/useRequest";
import systemApi from "@/services/systemSetting";
import dataLogsApi from "@/services/dataLogs";
import useRealTimeTraffic from "@/models/dataanalysis/useRealTimeTraffic";
import useTemporaryQuery from "@/models/dataanalysis/useTemporaryQuery";
import { InstanceType } from "@/services/systemSetting";
import { useState } from "react";

const DataAnalysis = () => {
  const [navKey, setNavKey] = useState<string>();
  const [instances, setInstances] = useState<InstanceType[]>([]);
  const [currentInstances, setCurrentInstances] = useState<number>();

  const realTimeTraffic = useRealTimeTraffic();
  const TemporaryQuery = useTemporaryQuery();

  const onChangeNavKey = (key: string) => {
    setNavKey(key);
  };

  const onChangeCurrentInstances = (value: number) => {
    setCurrentInstances(value);
  };

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
    instances,
    currentInstances,
    navKey,

    setInstances,
    onChangeCurrentInstances,
    onChangeNavKey,

    doGetInstance,
    doGetDatabase,
    doGetTables,

    realTimeTraffic,
    TemporaryQuery,
  };
};

export default DataAnalysis;
