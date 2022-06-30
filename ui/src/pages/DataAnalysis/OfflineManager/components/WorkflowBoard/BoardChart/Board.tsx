import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  MarkerType,
  ReactFlowProvider,
} from "react-flow-renderer";
import { graphlib, layout } from "dagre";

import "./styles/index.less";
import { useModel } from "@@/plugin-model/useModel";
import { useKeyPress } from "ahooks";
import DeletedModal from "@/components/DeletedModal";
import BoardNode from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart/BoardNode";
import { PrimaryEnums } from "@/pages/DataAnalysis/service/enums";

export interface BoardProps {
  boardNodes: any[];
  currentBoard: any;
  file: any;
  onDelete: (
    nodes: any[],
    params: {
      iid: number;
      primary: PrimaryEnums;
      workflowId: number;
    }
  ) => void;
  onCreate: (params: any, nodeInfo: any) => void;
}
const Board = ({
  boardNodes,
  file,
  currentBoard,
  onDelete,
  onCreate,
}: BoardProps) => {
  const BoardWrapper = useRef<any>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const [selectNodes, setSelectNodes] = useState<any[]>([]);

  const {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    showCreateNode,
    showNodeModal,
    setExtra,
  } = useModel("dataAnalysis", (model) => ({
    nodes: model.workflowBoard.nodes,
    setNodes: model.workflowBoard.setNodes,
    onNodesChange: model.workflowBoard.onNodesChange,
    edges: model.workflowBoard.edges,
    setEdges: model.workflowBoard.setEdges,
    onEdgesChange: model.workflowBoard.onEdgesChange,
    showCreateNode: model.workflowBoard.showCreateNode,
    setExtra: model.manageNode.setExtra,
    showNodeModal: model.manageNode.showNodeModal,
  }));

  const handleSelectNode = useCallback(({ nodes, edges }: any) => {
    setSelectNodes(nodes);
  }, []);

  const handleDeleteNode = useCallback(() => {
    // todo: 没有记住节点位置
    if (selectNodes.length <= 0) return;
    DeletedModal({
      content: `确定删除节点: ${selectNodes[0].data.node.name} 吗？`,
      onOk: () =>
        onDelete(selectNodes, {
          iid: currentBoard.iid,
          primary: currentBoard.primary,
          workflowId: currentBoard.workflowId,
        }),
    });
    return;
  }, [selectNodes]);

  useKeyPress("Backspace", handleDeleteNode);

  const onConnect = useCallback((params) => {
    setEdges((eds) =>
      addEdge(
        {
          ...params,
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        },
        eds
      )
    );
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = BoardWrapper.current?.getBoundingClientRect();
      const dataTrans = event.dataTransfer.getData("application/reactflow");
      const dropNodeInfo = JSON.parse(dataTrans);
      if (typeof dataTrans === "undefined" || !dataTrans || !dropNodeInfo) {
        return;
      }
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      showCreateNode(
        currentBoard,
        { ...position, ...dropNodeInfo },
        (params?: any) => setExtra(params),
        showNodeModal,
        onCreate
      );
    },
    [reactFlowInstance]
  );

  const getNodesPosition = useCallback((nodes: any[], edges: any[]) => {
    // compound: 支持复合查询
    let g = new graphlib.Graph({ directed: true, compound: true });
    g.setGraph({});
    g.setDefaultEdgeLabel(function () {
      return {};
    });
    for (const node of nodes) {
      g.setNode(node.id, { ...node.data, ...node.style });
    }
    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }
    // g.setParent("bbbb", "aaaa");
    layout(g);
    const newNodes: any[] = [];
    for (const node of nodes) {
      const graphNode = g.node(node.id);
      node.position = {
        x: graphNode.x,
        y: graphNode.y,
      };
      newNodes.push(node);
    }
    return newNodes;
  }, []);

  const handleChangeNodes = useCallback((nodeList: any[]) => {
    if (nodeList.length <= 0) {
      setNodes([]);
      return;
    }
    // Node
    const NodeList: any[] = [];
    const EdgeList: any[] = [];

    for (const node of nodeList) {
      // react-flow 组件 id 只支持 string 类型，如果不是 string 会出现许多 BUG，如：连接线不显示
      NodeList.push({
        id: node.id.toString(),
        type: "default",
        data: {
          label: <BoardNode node={node} onDelete={onDelete} />,
          node,
        },
        style: {
          width: 100,
          height: 32,
          padding: 0,
          lineHeight: "32px",
        },
      });
    }
    setNodes(() => getNodesPosition(NodeList, EdgeList));
    setEdges(() => [...edges, ...EdgeList]);
  }, []);

  useEffect(() => {
    handleChangeNodes(boardNodes);
  }, [boardNodes]);

  return (
    <div
      style={{
        flex: 1,
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <div className="dndflow">
        <ReactFlowProvider>
          <div className="reactflow-wrapper" ref={BoardWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              deleteKeyCode={null}
              multiSelectionKeyCode={null}
              onSelectionChange={handleSelectNode}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              attributionPosition="top-right"
              onDrop={onDrop}
              onlyRenderVisibleElements
              onDragOver={onDragOver}
              fitView
            />
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
};
export default Board;
