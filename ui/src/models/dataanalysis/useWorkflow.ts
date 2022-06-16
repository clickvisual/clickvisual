import { useState } from "react";
import workflowApi from "@/services/bigDataWorkflow";
import useRequest from "@/hooks/useRequest/useRequest";

const useWorkflow = () => {
  const [isFold, setIsFold] = useState<boolean>(false);

  const getWorkflows = useRequest(workflowApi.getWorkflows, {
    loadingText: false,
  });

  return {
    isFold,
    setIsFold,

    getWorkflows,
  };
};
export default useWorkflow;
