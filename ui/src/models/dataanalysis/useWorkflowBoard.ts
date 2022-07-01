import { useEdgesState, useNodesState } from "react-flow-renderer";
import { useRef, useState } from "react";
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
  const [boardEdges, setBoardEdges] = useState<string[]>([]);
  // const [isChange, setIsChange] = useState<boolean>(false);
  const createNodeInfoRef = useRef<any>();

  const showCreateNode = (
    board: any,
    nodeInfo: BoardCreateNodeInfo,
    onChangeExtra: (params: any) => void,
    showNodeModal: (callback?: (params?: any) => void) => void,
    onOk: (params: any, nodeInfo: any) => void
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
      onOk(data, nodeInfo);
    });
  };

  const connectEdge = (edge: any) => {
    setBoardEdges((boardEdges) => [...boardEdges, edge]);
  };

  const changeEdges = (edges: any[]) => {
    setBoardEdges(edges);
  };

  return {
    nodes,
    edges,
    boardEdges,

    setNodes,
    setEdges,

    onNodesChange,
    onEdgesChange,

    showCreateNode,

    connectEdge,
    changeEdges,
  };
};
export default useWorkflowBoard;
