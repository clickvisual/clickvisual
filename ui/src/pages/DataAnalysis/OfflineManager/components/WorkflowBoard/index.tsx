import { useModel } from "@@/plugin-model/useModel";
import { useCallback, useEffect, useState } from "react";
import FileTitle from "@/pages/DataAnalysis/components/FileTitle";
import { BoardChart } from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart";
import NodeManage from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/NodeManage/indxe";
import { SecondaryEnums } from "@/pages/DataAnalysis/service/enums";

export interface WorkflowBoardProps {
  currentBoard: any;
}
const WorkflowBoard = ({ currentBoard }: WorkflowBoardProps) => {
  const [file, setFile] = useState<any>();
  const {
    iid,
    getNodeInfo,
    updateNode,
    getNodes,
    doLockNode,
    doUnLockNode,
    doRunCodeNode,
    doStopCodeNode,
  } = useModel("dataAnalysis", (model) => ({
    iid: model.currentInstances,
    getNodeInfo: model.manageNode.doGetNodeInfo,
    updateNode: model.manageNode.doUpdatedNode,
    doLockNode: model.manageNode.doLockNode,
    doUnLockNode: model.manageNode.doUnLockNode,
    doRunCodeNode: model.manageNode.doRunCodeNode,
    doStopCodeNode: model.manageNode.doStopCodeNode,
    getNodes: model.manageNode.getFolders,
  }));

  const getNodeList = useCallback((folders: any[], nodes: any[]) => {
    const nodeList = nodes.filter(
      (node) => node.secondary !== SecondaryEnums.board
    );
    if (folders.length <= 0) {
      return nodeList;
    }
    const folderNodes: any[] = folders
      .map((folder) => {
        if (folder.children.length > 0) {
          return getNodeList(folder.children, folder.nodes);
        }
        return folder.nodes;
      })
      .flat();
    return [...nodeList, ...folderNodes];
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
          console.log("board: ", board);
          const folders = res.data.children;
          console.log(
            " getNodeList(folders, nodes): ",
            getNodeList(folders, nodes)
          );
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

  useEffect(() => {
    if (!currentBoard.id || !iid) return;
    doGetFile(currentBoard.id);
    doGetNodes(currentBoard);
  }, [currentBoard]);

  // todo: isChange 的状态没有判断
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <FileTitle
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
        <BoardChart />
      </div>
    </div>
  );
};
export default WorkflowBoard;
