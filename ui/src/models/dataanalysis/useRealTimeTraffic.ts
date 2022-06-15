import { useState } from "react";
import { DatabaseResponse, TablesResponse } from "@/services/dataLogs";
import useRequest from "@/hooks/useRequest/useRequest";
import realTimeBusinessApi, {
  BusinessChartResponse,
} from "@/services/realTimeTrafficFlow";
import { useEdgesState, useNodesState } from "react-flow-renderer";

const useRealTimeTraffic = () => {
  const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
  const [tables, setTables] = useState<TablesResponse[]>([]);
  const [businessChart, setBusinessChart] = useState<BusinessChartResponse[]>(
    []
  );
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const doGetBusinessChart = useRequest(realTimeBusinessApi.getBusinessChart, {
    loadingText: false,
  });

  return {
    databases,
    tables,
    businessChart,
    nodes,
    edges,

    setBusinessChart,
    setDatabases,
    setTables,
    setNodes,
    setEdges,

    onNodesChange,
    onEdgesChange,

    doGetBusinessChart,
  };
};
export default useRealTimeTraffic;
