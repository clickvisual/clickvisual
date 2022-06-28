import { useModel } from "@@/plugin-model/useModel";
import { useCallback, useEffect, useState } from "react";
import FileTitle from "@/pages/DataAnalysis/components/FileTitle";
import { BoardChart } from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart";
import NodeManage from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/NodeManage/indxe";

export interface WorkflowBoardProps {
  currentBoard: any;
}
const WorkflowBoard = ({ currentBoard }: WorkflowBoardProps) => {
  const [file, setFile] = useState<any>();
  const {
    getNodeInfo,
    updateNode,
    doLockNode,
    doUnLockNode,
    doRunCodeNode,
    doStopCodeNode,
  } = useModel("dataAnalysis", (model) => ({
    getNodeInfo: model.manageNode.doGetNodeInfo,
    updateNode: model.manageNode.doUpdatedNode,
    doLockNode: model.manageNode.doLockNode,
    doUnLockNode: model.manageNode.doUnLockNode,
    doRunCodeNode: model.manageNode.doRunCodeNode,
    doStopCodeNode: model.manageNode.doStopCodeNode,
  }));

  const doGetFile = useCallback((id: number) => {
    getNodeInfo.run(id).then((res) => {
      if (res?.code !== 0) return;
      setFile(res.data);
    });
  }, []);

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
    if (!currentBoard.id) return;
    doGetFile(currentBoard.id);
  }, [currentBoard]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <FileTitle
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
