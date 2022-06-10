import { useState } from "react";
import { DatabaseResponse, TablesResponse } from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";
import realTimeTrafficApi, {
  TrafficChartResponse,
} from "@/services/realTimeTrafficFlow";

const useRealTimeTraffic = () => {
  const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
  const [tables, setTables] = useState<TablesResponse[]>([]);
  const [trafficChart, setTrafficChart] = useState<TrafficChartResponse[]>([]);

  const doGetTrafficChart = useRequest(realTimeTrafficApi.getTrafficChart, {
    loadingText: false,
  });

  return {
    databases,
    tables,
    trafficChart,

    setTrafficChart,
    setDatabases,
    setTables,

    doGetTrafficChart,
  };
};
export default useRealTimeTraffic;
