import { useModel } from "@@/plugin-model/useModel";
import { useEffect } from "react";
import FileTitle, {
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import { BoardChart } from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart";
import NodeManage from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/NodeManage/indxe";
import BoardNode from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart/BoardNode";

export interface WorkflowBoardProps {
  currentBoard: any;
}
const WorkflowBoard = ({ currentBoard }: WorkflowBoardProps) => {
  const {
    iid,
    boardFile,
    doGetFile,
    updateNode,
    doLockNode,
    doUnLockNode,
    doRunCodeNode,
    doStopCodeNode,
    doGetNodes,
    boardNodeList,
    setNodes,
    doSetNodesAndFolders,
    handleDeleteNode,
  } = useModel("dataAnalysis", (model) => ({
    iid: model.currentInstances,
    updateNode: model.manageNode.doUpdatedNode,
    doLockNode: model.manageNode.doLockNode,
    doUnLockNode: model.manageNode.doUnLockNode,
    doRunCodeNode: model.manageNode.doRunCodeNode,
    doStopCodeNode: model.manageNode.doStopCodeNode,
    nodes: model.manageNode.nodes,
    folders: model.manageNode.folders,
    boardFile: model.manageNode.boardFile,
    boardNodeList: model.manageNode.boardNodeList,
    doGetFile: model.manageNode.doGetBoardFile,
    doGetNodes: model.manageNode.doGetBoardNodes,
    doSetNodesAndFolders: model.manageNode.doSetNodesAndFolders,
    handleDeleteNode: model.manageNode.handleDeleteNode,
    setNodes: model.workflowBoard.setNodes,
  }));

  const handleSave = () => {
    // todo: updateNode
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
    doRunCodeNode.run(file.id).then((res) => {
      if (res?.code !== 0) return;
      doGetFile(file.id);
    });
  };

  const handleStop = (file: any) => {
    doStopCodeNode.run(file.id).then((res) => {
      if (res?.code !== 0) return;
      doGetFile(file.id);
    });
  };

  const handleCreateNode = (node: any, nodeInfo: any) => {
    const newNode = {
      id: node.id.toString(),
      type: "default",
      data: {
        label: <BoardNode node={node} onDelete={handleDeleteNode} />,
        node,
      },
      style: {
        width: 100,
        height: 32,
        padding: 0,
        lineHeight: "32px",
      },
      position: {
        x: nodeInfo.x,
        y: nodeInfo.y,
      },
    };
    setNodes((nds) => nds.concat(newNode));
    doSetNodesAndFolders({
      iid: currentBoard.iid,
      primary: currentBoard.primary,
      workflowId: currentBoard.workflowId,
    });
  };

  // TODO
  useEffect(() => {
    if (!currentBoard.id || !iid) return;
    doGetFile(currentBoard.id);
    doGetNodes(currentBoard);
  }, [currentBoard]);

  // todo: isChange 的状态没有判断
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <FileTitle
        type={FileTitleType.node}
        isChange={false}
        onSave={handleSave}
        onStop={handleStop}
        onRun={handleRun}
        onLock={handleLock}
        onUnlock={handleUnlock}
        file={boardFile}
      />
      <div style={{ flex: 1, display: "flex" }}>
        <NodeManage />
        {boardFile && (
          <BoardChart
            currentBoard={currentBoard}
            boardNodes={boardNodeList}
            file={boardFile}
            onDelete={handleDeleteNode}
            onCreate={handleCreateNode}
          />
        )}
      </div>
    </div>
  );
};
export default WorkflowBoard;
