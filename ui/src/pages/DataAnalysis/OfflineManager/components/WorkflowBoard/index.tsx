import { useModel } from "@@/plugin-model/useModel";
import { useEffect, useMemo } from "react";
import FileTitle, {
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import { BoardChart } from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart";
import NodeManage from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/NodeManage/indxe";
import { message, Modal } from "antd";
import { TertiaryEnums } from "@/pages/DataAnalysis/service/enums";
import deletedModal from "@/components/DeletedModal";
import { NodeBoardIdEnums } from "@/models/dataanalysis/useManageNodeAndFolder";
import { useIntl } from "umi";
import { useEdgesState, useNodesState } from "react-flow-renderer";
// import { BoardCreateNodeInfo } from "@/models/dataanalysis/useWorkflowBoard";

export interface WorkflowBoardProps {
  currentBoard: any;
  currentPaneActiveKey: string;
  boardFile: any;
  doGetFile: any;
  doGetNodes: (board: any, file?: any) => void;
  doSetNodesAndFolders: any;
  deleteNodeById: any;
  createBoardNode: any;
  isChangeBoard: any;
  setBoardEdges: any;
  onSaveBoardNodes: any;
  boardNodeList: any;
  onChangeBoardNodes: any;
  updateBoardNode: any;
  connectEdge: any;
  deleteEdges: any;
  changeEdges: any;
  boardEdges: any;
  showCreateNode: any;
  // showNodeModal: any;
  // hideNodeModal: any;
  // showFolderModal: any;
  // hideFolderModal: any;
  // setIsBoardCreateNode: any;
  // setIsEditNode: any;
  // setCurrentNode: any;

  // isBoardCreateNode: any;
  // visibleFolder: any;
  // isEditNode: any;
  // currentNode: any;
}
const WorkflowBoard = (props: WorkflowBoardProps) => {
  const {
    currentBoard,
    // currentPaneActiveKey,
    doGetFile,
    boardFile,
    doGetNodes,
    doSetNodesAndFolders,
    deleteNodeById,
    createBoardNode,
    isChangeBoard,
    setBoardEdges,
    onSaveBoardNodes,
    boardNodeList,
    onChangeBoardNodes,
    updateBoardNode,
    connectEdge,
    deleteEdges,
    changeEdges,
    boardEdges,
    showCreateNode,
    // showNodeModal,
    // hideNodeModal,
    // showFolderModal,
    // hideFolderModal,
    // setIsBoardCreateNode,
    // setIsEditNode,
    // setCurrentNode,
    // isBoardCreateNode,
    // visibleFolder,
    // isEditNode,
    // currentNode,
  } = props;
  const i18n = useIntl();
  const {
    iid,
    // boardFile,
    // doGetFile,
    doLockNode,
    doUnLockNode,
    doRunCodeNode,
    doStopCodeNode,
    // doGetNodes,
    // doSetNodesAndFolders,
    // deleteNodeById,
    // createBoardNode,
    // isChangeBoard,
    // onSaveBoardNodes,
    // setBoardEdges,
    doMandatoryGetFileLock,
  } = useModel("dataAnalysis", (model) => ({
    iid: model.currentInstances,
    // boardNodeList: model.manageNode.boardNodeList,
    // boardFile: model.manageNode.boardFile,
    // doGetFile: model.manageNode.doGetBoardFile,
    // doGetNodes: model.manageNode.doGetBoardNodes,
    // doSetNodesAndFolders: model.manageNode.doSetNodesAndFolders,
    // deleteNodeById: model.manageNode.deleteNodeById,
    // setNodes: model.workflowBoard.setNodes,
    // createBoardNode: model.manageNode.createBoardNode, // ?
    // isChangeBoard: model.manageNode.isChangeBoard,
    // setBoardEdges: model.manageNode.setBoardEdges,
    // onSaveBoardNodes: model.manageNode.onSaveBoardNodes,

    updateNode: model.manageNode.doUpdatedNode,
    doLockNode: model.manageNode.doLockNode,
    doUnLockNode: model.manageNode.doUnLockNode,
    doRunCodeNode: model.manageNode.doRunCodeNode,
    doStopCodeNode: model.manageNode.doStopCodeNode,
    doMandatoryGetFileLock: model.manageNode.doMandatoryGetFileLock,
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
            doGetFile(file.id).then((res: { code: number; data: any }) => {
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
    doRunCodeNode.run(file.id).then((res) => {
      if (res?.code !== 0) return;
      doGetFile(file.id);
    });
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

  const handleGrabLock = (file: any) => {
    doMandatoryGetFileLock.run(file?.id).then((res: any) => {
      if (res.code != 0) return;
      doGetFile(file.id);
      message.success(
        i18n.formatMessage({
          id: "bigdata.components.FileTitle.grabLockSuccessful",
        })
      );
    });
  };

  // TODO
  useMemo(() => {
    if (!currentBoard.id || !iid) return;
    doGetFile(currentBoard.id).then((res: { code: number; data: any }) => {
      if (res?.code !== 0) return;
      doGetNodes(currentBoard, res.data);
    });
  }, [currentBoard]);

  useEffect(() => {
    setBoardEdges([]);
  }, [boardFile?.id]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  // const [isChange, setIsChange] = useState<boolean>(false);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
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
          onGrabLock={handleGrabLock}
          node={currentBoard}
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
            nodes={nodes}
            setNodes={setNodes}
            onNodesChange={onNodesChange}
            edges={edges}
            setEdges={setEdges}
            onEdgesChange={onEdgesChange}
            showCreateNode={showCreateNode}
            boardNodes={boardNodeList}
            onChangeBoardNodes={onChangeBoardNodes}
            updateBoardNode={updateBoardNode}
            connectEdge={connectEdge}
            deleteEdges={deleteEdges}
            changeEdges={changeEdges}
            boardEdges={boardEdges}
            // showNodeModal={showNodeModal}
            // hideNodeModal={hideNodeModal}
            // showFolderModal={showFolderModal}
            // hideFolderModal={hideFolderModal}
            // setIsBoardCreateNode={setIsBoardCreateNode}
            // setIsEditNode={setIsEditNode}
            // setCurrentNode={setCurrentNode}
          />
        )}
      </div>
    </div>
  );
};
export default WorkflowBoard;
