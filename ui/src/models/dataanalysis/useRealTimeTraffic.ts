import { useState } from "react";
import { DatabaseResponse, TablesResponse } from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";
import realTimeBusinessApi, {
  BusinessChartResponse,
} from "@/services/realTimeTrafficFlow";

const useRealTimeTraffic = () => {
  const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
  const [tables, setTables] = useState<TablesResponse[]>([]);
  const [businessChart, setBusinessChart] = useState<BusinessChartResponse[]>(
    []
  );

  const doGetBusinessChart = useRequest(realTimeBusinessApi.getBusinessChart, {
    loadingText: false,
  });

  return {
    databases,
    tables,
    businessChart,

    setBusinessChart,
    setDatabases,
    setTables,

    doGetBusinessChart,
  };
};
export default useRealTimeTraffic;
