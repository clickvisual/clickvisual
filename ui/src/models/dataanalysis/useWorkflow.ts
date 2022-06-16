import { useState } from "react";
import workflowApi, { WorkflowInfo } from "@/services/bigDataWorkflow";
import useRequest from "@/hooks/useRequest/useRequest";
import { formatMessage } from "@@/plugin-locale/localeExports";

const useWorkflow = () => {
  const [isFold, setIsFold] = useState<boolean>(false);
  const [visibleWorkflowEditModal, setVisibleWorkflowEditModal] =
    useState<boolean>(false);
  const [isEditWorkflow, setIsEditWorkflow] = useState<boolean>(false);

  const [workflowList, setWorkflowList] = useState<WorkflowInfo[]>([]);
  const [editWorkflow, setEditWorkFlow] = useState<WorkflowInfo>();

  const getWorkflows = useRequest(workflowApi.getWorkflows, {
    loadingText: false,
  });

  const getWorkflow = useRequest(workflowApi.getWorkflowInfo, {
    loadingText: false,
  });

  const addWorkflow = useRequest(workflowApi.createdWorkflow, {
    loadingText: {
      loading: undefined,
      done: formatMessage({ id: "bigdata.workflow.add.success" }),
    },
  });

  const updateWorkflow = useRequest(workflowApi.updatedWorkflow, {
    loadingText: {
      loading: undefined,
      done: formatMessage({ id: "bigdata.workflow.add.success" }),
    },
  });

  const deleteWorkflow = useRequest(workflowApi.deleteWorkflow, {
    loadingText: false,
  });

  return {
    isFold,
    isEditWorkflow,
    workflowList,
    editWorkflow,
    visibleWorkflowEditModal,

    setIsFold,
    setIsEditWorkflow,
    setWorkflowList,
    setEditWorkFlow,
    setVisibleWorkflowEditModal,

    getWorkflows,
    getWorkflow,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
  };
};
export default useWorkflow;
