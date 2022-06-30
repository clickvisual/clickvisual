import { useEdgesState, useNodesState } from "react-flow-renderer";
import { useRef } from "react";
import {
  SecondaryEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";

type BoardCreateNodeInfo = {
  x: number;
  y: number;
  nodeType: string;
  tertiary: TertiaryEnums;
  secondary: SecondaryEnums;
  nodeInfo: any;
};

const useWorkflowBoard = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const createNodeInfoRef = useRef<any>();

  const showCreateNode = (
    board: any,
    nodeInfo: BoardCreateNodeInfo,
    onChangeExtra: (params: any) => void,
    showNodeModal: (callback?: (params?: any) => void) => void,
    onOk: () => void
  ) => {
    createNodeInfoRef.current = nodeInfo;
    onChangeExtra({
      iid: board.iid,
      primary: board.primary,
      secondary: nodeInfo.secondary,
      workflowId: board.workflowId,
      tertiary: nodeInfo.tertiary,
      folderId: board.folderId,
    });
    showNodeModal((data) => {
      createNodeInfoRef.current = { ...nodeInfo, node: data };
      onOk();
    });
  };

  const submitCreateNode = () => {
    // ..
  };

  return {
    nodes,
    edges,

    setNodes,
    setEdges,

    onNodesChange,
    onEdgesChange,

    showCreateNode,
    submitCreateNode,
  };
};
export default useWorkflowBoard;
