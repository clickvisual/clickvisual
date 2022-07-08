import { useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";
import realTimeBusinessApi, {
  BusinessChartResponse,
} from "@/services/realTimeTrafficFlow";
import { useEdgesState, useNodesState } from "react-flow-renderer";

const useRealTimeTraffic = () => {
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [businessChart, setBusinessChart] = useState<BusinessChartResponse[]>([
    {
      database: "nocnoc",
      table: "app_stdout_local_stream",
      engine: "Kafka",
      totalRows: 0,
      totalBytes: 0,
      deps: ["app_stdout_local_view"],
    },
    {
      database: "nocnoc",
      table: "app_stdout_local_view",
      engine: "MaterializedView",
      totalRows: 0,
      totalBytes: 0,
      deps: ["app_stdout_local"],
    },
    {
      database: "nocnoc",
      table: "app_stdout_local",
      engine: "ReplicatedMergeTree",
      totalRows: 16608417,
      totalBytes: 1556104840,
      deps: [
        "app_stdout_c996af89_1497_4241_8494_afa3a0f84134",
        "app_stdout_b9e8ba1c_5d29_4a65_9abc_c59cc98f87f5",
        "app_stdout_0630c8eb_faf3_427e_8b3c_e689b5f4223e",
        "app_stdout",
      ],
    },
    {
      database: "nocnoc",
      table: "app_stdout_c996af89_1497_4241_8494_afa3a0f84134",
      engine: "MaterializedView",
      totalRows: 0,
      totalBytes: 0,
      deps: ["samples"],
    },
    {
      database: "metrics",
      table: "samples",
      engine: "Distributed",
      totalRows: 0,
      totalBytes: 0,
      deps: [],
    },
    {
      database: "nocnoc",
      table: "app_stdout_b9e8ba1c_5d29_4a65_9abc_c59cc98f87f5",
      engine: "MaterializedView",
      totalRows: 0,
      totalBytes: 0,
      deps: ["samples"],
    },
    {
      database: "nocnoc",
      table: "app_stdout_0630c8eb_faf3_427e_8b3c_e689b5f4223e",
      engine: "MaterializedView",
      totalRows: 0,
      totalBytes: 0,
      deps: ["samples"],
    },
    {
      database: "nocnoc",
      table: "app_stdout",
      engine: "Distributed",
      totalRows: 0,
      totalBytes: 0,
      deps: [],
    },
  ]);
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
