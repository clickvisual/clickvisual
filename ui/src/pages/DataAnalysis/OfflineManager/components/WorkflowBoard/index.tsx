import { useModel } from "@@/plugin-model/useModel";
import { useMemo } from "react";
import FileTitle, {
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import { BoardChart } from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart";
import NodeManage from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/NodeManage/indxe";
import { Modal } from "antd";

export interface WorkflowBoardProps {
  currentBoard: any;
}
const WorkflowBoard = ({ currentBoard }: WorkflowBoardProps) => {
  const {
    iid,
    boardFile,
    doGetFile,
    doLockNode,
    doUnLockNode,
    // doRunCodeNode,
    doStopCodeNode,
    doGetNodes,
    doSetNodesAndFolders,
    deleteNodes,
    createBoardNode,
    isChangeBoard,
    onSaveBoardNodes,
  } = useModel("dataAnalysis", (model) => ({
    iid: model.currentInstances,
    updateNode: model.manageNode.doUpdatedNode,
    doLockNode: model.manageNode.doLockNode,
    doUnLockNode: model.manageNode.doUnLockNode,
    doRunCodeNode: model.manageNode.doRunCodeNode,
    doStopCodeNode: model.manageNode.doStopCodeNode,
    boardFile: model.manageNode.boardFile,
    doGetFile: model.manageNode.doGetBoardFile,
    doGetNodes: model.manageNode.doGetBoardNodes,
    doSetNodesAndFolders: model.manageNode.doSetNodesAndFolders,
    deleteNodes: model.manageNode.deleteNodes,
    setNodes: model.workflowBoard.setNodes,
    createBoardNode: model.manageNode.createBoardNode,
    isChangeBoard: model.manageNode.isChangeBoard,
    onSaveBoardNodes: model.manageNode.onSaveBoardNodes,
  }));
  const { currentUser } = useModel("@@initialState").initialState || {};

  const isLock = useMemo(() => {
    if (!boardFile) return true;
    return (
      !boardFile.lockUid ||
      boardFile.lockUid === 0 ||
      boardFile.lockUid !== currentUser?.id
    );
  }, [boardFile, currentUser]);

  const handleSave = () => {
    onSaveBoardNodes(currentBoard);
  };

  const handleLock = (file: any) => {
    doLockNode.run(file.id).then((res: any) => {
      if (res.code !== 0) return;
      doGetFile(file.id);
    });
  };

  const handleUnlock = (file: any) => {
    doUnLockNode.run(file.id).then((res: any) => {
      if (res.code !== 0) return;
      doGetFile(file.id);
    });
  };

  const handleRun = (file: any) => {
    Modal.info({
      title: "提示",
      content: "看板运行功能正在开发中...",
    });
    // doRunCodeNode.run(file.id).then((res) => {
    //   if (res?.code !== 0) return;
    //   doGetFile(file.id);
    // });
  };

  const handleStop = (file: any) => {
    doStopCodeNode.run(file.id).then((res) => {
      if (res?.code !== 0) return;
      doGetFile(file.id);
    });
  };

  const handleCreateNode = (node: any, nodeInfo: any) => {
    const newNode = {
      ...node,
      position: {
        x: nodeInfo.x,
        y: nodeInfo.y,
      },
    };
    createBoardNode(newNode);
    doSetNodesAndFolders({
      iid: currentBoard.iid,
      primary: currentBoard.primary,
      workflowId: currentBoard.workflowId,
    });
  };

  // TODO
  useMemo(() => {
    if (!currentBoard.id || !iid) return;
    doGetFile(currentBoard.id).then((res) => {
      if (res?.code !== 0) return;
      doGetNodes(currentBoard, res.data);
    });
  }, [currentBoard]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {boardFile && (
        <FileTitle
          type={FileTitleType.node}
          isChange={isChangeBoard}
          onSave={handleSave}
          onStop={handleStop}
          onRun={handleRun}
          onLock={handleLock}
          onUnlock={handleUnlock}
          file={boardFile}
        />
      )}
      <div style={{ flex: 1, display: "flex" }}>
        <NodeManage isLock={isLock} />
        {boardFile && (
          <BoardChart
            isLock={isLock}
            currentBoard={currentBoard}
            onDelete={deleteNodes}
            onCreate={handleCreateNode}
          />
        )}
      </div>
    </div>
  );
};
export default WorkflowBoard;
