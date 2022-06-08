import { useState } from "react";
import { InstanceType } from "@/services/systemSetting";
import { DatabaseResponse, TablesResponse } from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";
import realTimeTrafficApi from "@/services/realTimeTrafficFlow";

const useRealTimeTraffic = () => {
  const [instances, setInstances] = useState<InstanceType[]>([]);
  const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
  const [tables, setTables] = useState<TablesResponse[]>([]);
  const [trafficChart, setTrafficChart] = useState<any>();

  const doGetTrafficChart = useRequest(realTimeTrafficApi.getTrafficChart, {
    loadingText: false,
  });

  return {
    instances,
    databases,
    tables,
    trafficChart,

    setTrafficChart,
    setInstances,
    setDatabases,
    setTables,

    doGetTrafficChart,
  };
};
export default useRealTimeTraffic;
