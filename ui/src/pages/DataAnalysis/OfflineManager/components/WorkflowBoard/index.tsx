import { useModel } from "@@/plugin-model/useModel";
import { useCallback, useEffect, useState } from "react";
import FileTitle, {
  FileTitleType,
} from "@/pages/DataAnalysis/components/FileTitle";
import { BoardChart } from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart";
import NodeManage from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/NodeManage/indxe";
import { SecondaryEnums } from "@/pages/DataAnalysis/service/enums";

export interface WorkflowBoardProps {
  currentBoard: any;
}
const WorkflowBoard = ({ currentBoard }: WorkflowBoardProps) => {
  const [file, setFile] = useState<any>();
  const [nodeList, setNodeList] = useState<any[]>([]);
  const {
    iid,
    nodes,
    folders,
    getNodeInfo,
    updateNode,
    deleteNode,
    getNodes,
    doLockNode,
    doUnLockNode,
    doRunCodeNode,
    doStopCodeNode,
    doSetNodesAndFolders,
  } = useModel("dataAnalysis", (model) => ({
    iid: model.currentInstances,
    getNodeInfo: model.manageNode.doGetNodeInfo,
    updateNode: model.manageNode.doUpdatedNode,
    deleteNode: model.manageNode.doDeletedNode,
    doLockNode: model.manageNode.doLockNode,
    doUnLockNode: model.manageNode.doUnLockNode,
    doRunCodeNode: model.manageNode.doRunCodeNode,
    doStopCodeNode: model.manageNode.doStopCodeNode,
    getNodes: model.manageNode.getFolders,
    nodes: model.manageNode.nodes,
    folders: model.manageNode.folders,
    doSetNodesAndFolders: model.manageNode.doSetNodesAndFolders,
  }));

  const getNodeList = useCallback((folders: any[], nodes: any[]) => {
    const list = nodes.filter(
      (node) => node.secondary !== SecondaryEnums.board
    );
    if (folders.length <= 0) {
      return list;
    }
    const folderNodes: any[] = folders
      .map((folder) => {
        if (folder.children.length > 0) {
          return getNodeList(folder.children, folder.nodes);
        }
        return folder.nodes;
      })
      .flat();
    return [...list, ...folderNodes];
  }, []);

  const doGetFile = useCallback((id: number) => {
    getNodeInfo.run(id).then((res) => {
      if (res?.code !== 0) return;
      setFile(res.data);
    });
  }, []);

  const doGetNodes = useCallback(
    (board: any) => {
      if (!iid) return;
      getNodes
        .run({
          iid,
          primary: board.primary,
          workflowId: board.workflowId,
        })
        .then((res) => {
          if (res?.code !== 0) return;
          const nodes = res.data.nodes.filter(
            (node) => node.secondary !== SecondaryEnums.board
          );
          const folders = res.data.children;
          setNodeList(() => getNodeList(folders, nodes));
        });
    },
    [iid]
  );

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

  const handleDeleteNode = async (selectNodeList: any[]) => {
    if (selectNodeList.length < 1) {
      return;
    }
    if (selectNodeList.length === 1) {
      await deleteNode.run(selectNodeList[0].id);
    } else {
      for (const node of selectNodeList) {
        await deleteNode.run(node.id);
      }
    }
    doGetFile(currentBoard.id);
    doGetNodes(currentBoard);
    doSetNodesAndFolders({
      iid: currentBoard.iid,
      primary: currentBoard.primary,
      workflowId: currentBoard.workflowId,
    });
  };

  const handleCreateNode = () => {
    doGetFile(currentBoard.id);
    doGetNodes(currentBoard);
    doSetNodesAndFolders({
      iid: currentBoard.iid,
      primary: currentBoard.primary,
      workflowId: currentBoard.workflowId,
    });
  };

  useEffect(() => {
    if (!currentBoard.id || !iid) return;
    doGetFile(currentBoard.id);
    doGetNodes(currentBoard);
  }, [currentBoard, nodes, folders]);

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
        file={file}
      />
      <div style={{ flex: 1, display: "flex" }}>
        <NodeManage />
        {file && (
          <BoardChart
            currentBoard={currentBoard}
            boardNodes={nodeList}
            file={file}
            onDelete={handleDeleteNode}
            onCreate={handleCreateNode}
          />
        )}
      </div>
    </div>
  );
};
export default WorkflowBoard;
