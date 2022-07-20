import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo } from "react";
import FileTitle, {
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import { BoardChart } from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart";
import NodeManage from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/NodeManage/indxe";
import { Modal } from "antd";
import { TertiaryEnums } from "@/pages/DataAnalysis/service/enums";
import deletedModal from "@/components/DeletedModal";
import { NodeBoardIdEnums } from "@/models/dataanalysis/useManageNodeAndFolder";

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
    deleteNodeById,
    createBoardNode,
    isChangeBoard,
    onSaveBoardNodes,
    setBoardEdges,
  } = useModel("dataAnalysis", (model) => ({
    iid: model.currentInstances,
    boardNodeList: model.manageNode.boardNodeList,
    updateNode: model.manageNode.doUpdatedNode,
    doLockNode: model.manageNode.doLockNode,
    doUnLockNode: model.manageNode.doUnLockNode,
    doRunCodeNode: model.manageNode.doRunCodeNode,
    doStopCodeNode: model.manageNode.doStopCodeNode,
    boardFile: model.manageNode.boardFile,
    doGetFile: model.manageNode.doGetBoardFile,
    doGetNodes: model.manageNode.doGetBoardNodes,
    doSetNodesAndFolders: model.manageNode.doSetNodesAndFolders,
    deleteNodeById: model.manageNode.deleteNodeById,
    setNodes: model.workflowBoard.setNodes,
    createBoardNode: model.manageNode.createBoardNode,
    isChangeBoard: model.manageNode.isChangeBoard,
    setBoardEdges: model.manageNode.setBoardEdges,

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
    if (isChangeBoard) {
      Modal.confirm({
        title: "提示",
        content: "当前存在未保存的操作，是否要退出",
        onOk: () =>
          doUnLockNode.run(file.id).then((res: any) => {
            if (res?.code !== 0) return;
            setBoardEdges([]);
            doGetFile(file.id).then((res) => {
              if (res?.code !== 0) return;
              doGetNodes(currentBoard, res.data);
              doSetNodesAndFolders({
                iid: currentBoard.iid,
                primary: currentBoard.primary,
                workflowId: currentBoard.workflowId,
              });
            });
          }),
      });
    } else {
      doUnLockNode.run(file.id).then((res: any) => {
        if (res.code !== 0) return;
        doGetFile(file.id);
      });
    }
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

  const handleBoardDeleteNode = (node: any) => {
    deletedModal({
      content: `确定删除节点: ${node.name} 吗？`,
      onOk: () => {
        return deleteNodeById(node.id).then((res: any) => {
          if (
            node.tertiary !== TertiaryEnums.start &&
            node.tertiary !== TertiaryEnums.end
          ) {
            doSetNodesAndFolders({
              iid: iid!,
              primary: node.primary,
              workflowId: node.workflowId,
            });
          }
          if (res.code == 0) {
            setBoardEdges([]);
          }
        });
      },
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
      id: node.id,
      name: node.name,
      tertiary: node.tertiary,
      primary: node?.primary,
      secondary: node?.secondary,
      workflowId: node?.workflowId,
      sourceId: node?.sourceId,
      position: {
        x: nodeInfo.x,
        y: nodeInfo.y,
      },
    };
    createBoardNode(newNode);
    if (!NodeBoardIdEnums[node.id]) {
      doSetNodesAndFolders({
        iid: currentBoard.iid,
        primary: currentBoard.primary,
        workflowId: currentBoard.workflowId,
      });
    }
  };

  // TODO
  useMemo(() => {
    if (!currentBoard.id || !iid) return;
    doGetFile(currentBoard.id).then((res) => {
      if (res?.code !== 0) return;
      doGetNodes(currentBoard, res.data);
    });
  }, [currentBoard]);

  useEffect(() => {
    setBoardEdges([]);
  }, [boardFile?.id]);

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
            onDeleteRight={handleBoardDeleteNode}
            onCreate={handleCreateNode}
          />
        )}
      </div>
    </div>
  );
};
export default WorkflowBoard;
