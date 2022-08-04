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
    changeOpenNodeId,
    changeOpenNodeParentId,
    handleLockFile,
    handleUnLockFile,
    handleSaveNode,
    changeFolderContent,
    folderContent,
    handleGrabLock,
  } = useModel("dataAnalysis");
  // TODO:整改

  useEffect(() => {
    selectNode?.id && changeOpenNodeId(selectNode.id);
    if (selectNode?.secondary == SecondaryEnums.dataMining) {
      changeOpenNodeParentId(selectNode.folderId);
    }
  }, [selectNode, selectNode?.id, selectNode?.folderId, selectNode?.secondary]);

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
            onLock={() => handleLockFile(openNodeData?.id as number)}
            onUnlock={() => handleUnLockFile(openNodeData?.id as number)}
            type={FileTitleType.sql}
            onFormat={() => changeFolderContent(format(folderContent))}
            onGrabLock={handleGrabLock}
          />
        );
      case SecondaryEnums.board:
        return <WorkflowBoard currentBoard={selectNode} />;
      default:
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
  }, [selectNode, openNodeData, isUpdateStateFun(), folderContent]);
  return <>{Content}</>;
};

export default WorkflowContent;
