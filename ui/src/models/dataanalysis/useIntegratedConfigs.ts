import workflowApi from "@/services/bigDataWorkflow";
import useRequest from "@/hooks/useRequest/useRequest";

const useIntegratedConfigs = () => {
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
  };
};
export default useIntegratedConfigs;
