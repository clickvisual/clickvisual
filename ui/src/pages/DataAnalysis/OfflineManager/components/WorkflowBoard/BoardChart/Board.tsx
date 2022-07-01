import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  MarkerType,
  ReactFlowProvider,
} from "react-flow-renderer";
import { graphlib, layout } from "dagre";

import "./styles/index.less";
import { useModel } from "@@/plugin-model/useModel";
import BoardNode from "@/pages/DataAnalysis/OfflineManager/components/WorkflowBoard/BoardChart/BoardNode";
import {
  FlowNodeTypeEnums,
  TertiaryEnums,
} from "@/pages/DataAnalysis/service/enums";

export interface BoardProps {
  currentBoard: any;
  onDelete: (nodeIds: number[]) => Promise<any>;
  onCreate: (params: any, nodeInfo: any) => void;
  isLock: boolean;
}
const Board = ({ isLock, currentBoard, onDelete, onCreate }: BoardProps) => {
  const BoardWrapper = useRef<any>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // const [selectNodes, setSelectNodes] = useState<any[]>([]);

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
    boardNodes,
    boardEdges,
    connectEdge,
    onChangeBoardNodes,
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
    boardNodes: model.manageNode.boardNodeList,
    onChangeBoardNodes: model.manageNode.onChangeBoardNodes,
    boardEdges: model.workflowBoard.boardEdges,
    connectEdge: model.workflowBoard.connectEdge,
  }));

  // const handleSelectNode = useCallback(({ nodes, edges }: any) => {
  //   setSelectNodes(nodes);
  // }, []);

  // const handleDeleteNode = useCallback(() => {
  //   // todo: 没有记住节点位置
  //   if (selectNodes.length <= 0) return;
  //
  //   DeletedModal({
  //     content: `确定删除节点: ${selectNodes[0].data.node.name} 吗？`,
  //     onOk: () =>
  //       onDelete(selectNodes.map((item) => parseInt(item.id))).then(() =>
  //         doSetNodesAndFolders({
  //           iid: currentBoard.iid,
  //           primary: currentBoard.primary,
  //           workflowId: currentBoard.workflowId,
  //         })
  //       ),
  //   });
  //   return;
  // }, [selectNodes]);

  // useKeyPress("Backspace", handleDeleteNode);

  const onConnect = useCallback((params) => {
    const edge = {
      ...params,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
    };
    setEdges((eds) => addEdge(edge, eds));
    connectEdge(edge);
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
      if (!node?.position) {
        node.position = {
          x: graphNode.x,
          y: graphNode.y,
        };
      }
      newNodes.push(node);
    }
    return newNodes;
  }, []);

  const onNodeDragStop = useCallback(
    (event, node) => {
      const cloneBoardNodes = [...boardNodes];
      cloneBoardNodes.forEach((item) => {
        if (item.id.toString() === node.id) {
          item.position = node.position;
        }
      });
      onChangeBoardNodes(cloneBoardNodes);
    },
    [boardNodes]
  );

  const handleChangeNodes = useCallback((nodeList: any[], edgeList: any[]) => {
    if (nodeList.length <= 0) {
      setNodes([]);
      return;
    }
    // Node
    const NodeList: any[] = [];
    const EdgeList: any[] = edgeList;
    for (const node of nodeList) {
      let type = FlowNodeTypeEnums.default;
      switch (node.tertiary) {
        case TertiaryEnums.input:
          type = FlowNodeTypeEnums.input;
          break;
        case TertiaryEnums.output:
          type = FlowNodeTypeEnums.output;
          break;
        default:
          type = FlowNodeTypeEnums.default;
          break;
      }

      // react-flow 组件 id 只支持 string 类型，如果不是 string 会出现许多 BUG，如：连接线不显示
      NodeList.push({
        id: node.id.toString(),
        type,
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
        position: node?.position,
      });
    }

    const newNodes = () => {
      if (nodeList.findIndex((item) => !item?.position) > -1) {
        return getNodesPosition(NodeList, EdgeList);
      }
      return NodeList;
    };

    setNodes(newNodes);
    setEdges(() => [...edges, ...EdgeList]);
  }, []);

  useMemo(() => {
    console.log("boardNodes, boardEdges:", boardNodes, boardEdges);
    handleChangeNodes(boardNodes, boardEdges);
  }, [boardNodes, boardEdges]);

  return (
    <div
      style={{
        flex: 1,
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      {/*isLock*/}
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
              onNodeDragStop={onNodeDragStop}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              attributionPosition="top-right"
              onDrop={onDrop}
              onlyRenderVisibleElements
              onDragOver={onDragOver}
              fitView
              nodesConnectable={!isLock}
              elementsSelectable={!isLock}
              nodesDraggable={!isLock}
            />
          </div>
        </ReactFlowProvider>
      </div>
    </div>
  );
};
export default Board;
