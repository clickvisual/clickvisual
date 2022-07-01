import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo } from "react";
import FileTitle, {
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import { BoardChart } from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart";
import NodeManage from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/NodeManage/indxe";
import { parseJsonObject } from "@/utils/string";
import { Modal } from "antd";

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
    // doRunCodeNode,
    doStopCodeNode,
    doGetNodes,
    doSetNodesAndFolders,
    deleteNodes,
    createBoardNode,
    boardNodeList,
    boardEdges,
    changeEdges,
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
    doGetFile: model.manageNode.doGetBoardFile,
    doGetNodes: model.manageNode.doGetBoardNodes,
    doSetNodesAndFolders: model.manageNode.doSetNodesAndFolders,
    deleteNodes: model.manageNode.deleteNodes,
    setNodes: model.workflowBoard.setNodes,
    createBoardNode: model.manageNode.createBoardNode,
    boardNodeList: model.manageNode.boardNodeList,
    boardEdges: model.workflowBoard.boardEdges,
    changeEdges: model.workflowBoard.changeEdges,
  }));
  const { currentUser } = useModel("@@initialState").initialState || {};

  const isLock = useMemo(() => {
    console.log("boardFile: ", boardFile);
    if (!boardFile) return true;
    return (
      !boardFile.lockUid ||
      boardFile.lockUid === 0 ||
      boardFile.lockUid !== currentUser?.id
    );
  }, [boardFile, currentUser]);

  const handleSave = () => {
    // todo: updateNode
    const boardNodes = boardNodeList.map((item) => ({
      id: item.id,
      position: item.position,
    }));
    updateNode.run(currentBoard.id, {
      ...currentBoard,
      content: JSON.stringify({ boardNodeList: boardNodes, boardEdges }),
    });
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
  useEffect(() => {
    if (!currentBoard.id || !iid) return;
    doGetFile(currentBoard.id).then((res) => {
      if (res?.code !== 0) return;
      doGetNodes(currentBoard, res.data);
      const content = parseJsonObject(res.data?.content);
      if (!!content && content?.boardEdges) {
        changeEdges(content.boardEdges);
      }
    });
  }, [currentBoard]);

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
