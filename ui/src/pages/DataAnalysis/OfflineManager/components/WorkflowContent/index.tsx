import WorkflowSql from "@/pages/DataAnalysis/components/SQLEditor";
import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo } from "react";
import { Empty } from "antd";
import { SecondaryEnums } from "@/pages/DataAnalysis/service/enums";
import IntegratedConfiguration from "@/pages/DataAnalysis/OfflineManager/components/IntegratedConfiguration";
import WorkflowBoard from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard";
import { FileTitleType } from "@/pages/DataAnalysis/components/FileTitle";
import { format } from "sql-formatter";

const WorkflowContent = () => {
  const { selectNode } = useModel("dataAnalysis", (model) => ({
    selectNode: model.manageNode.selectNode,
  }));
  const {
    openNodeData,
    isUpdateStateFun,
    openNodeId,
    changeOpenNodeId,
    changeOpenNodeParentId,
    handleLockFile,
    handleUnLockFile,
    handleSaveNode,
    handleRunCode,
    changeFolderContent,
    folderContent,
  } = useModel("dataAnalysis");

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
        return (
          <WorkflowSql
            isChange={isUpdateStateFun()}
            file={openNodeData}
            onSave={() => handleSaveNode()}
            onLock={() => handleLockFile(openNodeId as number)}
            onUnlock={() => handleUnLockFile(openNodeId as number)}
            onRun={() => handleRunCode(openNodeId as number)}
            type={FileTitleType.sql}
            onFormat={() => changeFolderContent(format(folderContent))}
          />
        );
      case SecondaryEnums.board:
        return <WorkflowBoard currentBoard={selectNode} />;
      default:
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
  }, [selectNode]);
  return <>{Content}</>;
};

export default WorkflowContent;
