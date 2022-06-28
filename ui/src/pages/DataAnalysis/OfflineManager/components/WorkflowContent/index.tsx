import WorkflowSql from "@/pages/DataAnalysis/components/SQLEditor";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo } from "react";
import { Empty } from "antd";
import { SecondaryEnums } from "@/pages/DataAnalysis/service/enums";
import IntegratedConfiguration from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration";
import WorkflowBoard from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard";

const WorkflowContent = () => {
  const { selectNode } = useModel("dataAnalysis", (model) => ({
    selectNode: model.manageNode.selectNode,
  }));
  const { changeOpenNodeId, changeOpenNodeParentId } = useModel("dataAnalysis");

  useEffect(() => {
    if (selectNode?.secondary == SecondaryEnums.dataMining) {
      changeOpenNodeId(selectNode.id);
      changeOpenNodeParentId(selectNode.folderId);
    }
  }, [selectNode, selectNode.id, selectNode.folderId, selectNode?.secondary]);

  const Content = useMemo(() => {
    switch (selectNode?.secondary) {
      case SecondaryEnums.dataIntegration:
        return <IntegratedConfiguration currentNode={selectNode} />;
      case SecondaryEnums.dataMining:
        return <WorkflowSql />;
      case SecondaryEnums.board:
        return <WorkflowBoard currentBoard={selectNode} />;
      default:
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
  }, [selectNode]);
  return <>{Content}</>;
};

export default WorkflowContent;
