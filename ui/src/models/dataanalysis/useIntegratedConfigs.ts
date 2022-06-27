import workflowApi from "@/services/bigDataWorkflow";
import useRequest from "@/hooks/useRequest/useRequest";
import { useState } from "react";

const useIntegratedConfigs = () => {
  const [sourceColumns, setSourceColumns] = useState<any[]>([]);
  const [targetColumns, setTargetColumns] = useState<any[]>([]);
  const [mappingData, setMappingData] = useState<any[]>([]);

  const doGetSources = useRequest(workflowApi.getSourceList, {
    loadingText: false,
  });
  const doGetSourceTables = useRequest(workflowApi.getSourceTables, {
    loadingText: false,
  });

  const doGetColumns = useRequest(workflowApi.getSourceColumns, {
    loadingText: false,
  });

  return {
    doGetSources,
    doGetColumns,
    doGetSourceTables,

    sourceColumns,
    targetColumns,
    mappingData,
    setSourceColumns,
    setTargetColumns,
    setMappingData,
  };
};
export default useIntegratedConfigs;
