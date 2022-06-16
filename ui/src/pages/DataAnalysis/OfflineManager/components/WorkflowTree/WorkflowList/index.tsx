import offlineStyles from "@/pages/DataAnalysis/OfflineManager/index.less";
import { useModel } from "@@/plugin-model/useModel";
import { useMemo } from "react";
import WorkflowLine from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/WorkflowList/WorkflowLine";

const WorkflowList = () => {
  const { workflow } = useModel("dataAnalysis");
  const { workflowList } = workflow;

  const List = useMemo(() => {
    if (workflowList.length <= 0) return null;
    return workflowList.map((workflow) => (
      <WorkflowLine key={workflow.id} workflow={workflow} />
    ));
  }, [workflowList]);

  return (
    <div className={offlineStyles.workflowList}>
      <ul>{List}</ul>
    </div>
  );
};

export default WorkflowList;
