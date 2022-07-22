import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Handle,
  MarkerType,
  MiniMap,
  Position,
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
import deletedModal from "@/components/DeletedModal";
import { useKeyPress } from "ahooks";
// import { Spin } from "antd";

export interface BoardProps {
  currentBoard: any;
  onDeleteRight: (node: any) => void;
  onCreate: (params: any, nodeInfo: any) => void;
  isLock: boolean;
}

const Board = ({
  isLock,
  currentBoard,
  onDeleteRight,
  onCreate,
}: BoardProps) => {
  const BoardWrapper = useRef<any>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectEdges, setSelectEdges] = useState<any[]>([]);
  const nodeListRef = useRef<any[]>([]);

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
    deleteEdges,
    onChangeBoardNodes,
    setIsBoardCreateNode,
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
    boardEdges: model.manageNode.boardEdges,
    connectEdge: model.manageNode.connectEdge,
    deleteEdges: model.manageNode.deleteEdges,
    setIsBoardCreateNode: model.manageNode.setIsBoardCreateNode,
  }));

  const onSelectionChange = useCallback(({ edges }) => {
    setSelectEdges(edges);
  }, []);

  const handleDeleteEdges = useCallback(() => {
    if (selectEdges.length <= 0) return;

    deletedModal({
      content: `确定删除连接吗？`,
      onOk: () => deleteEdges(selectEdges),
    });
    return;
  }, [selectEdges]);

  useKeyPress("Backspace", handleDeleteEdges);

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
      if (
        dropNodeInfo.tertiary === TertiaryEnums.start ||
        dropNodeInfo.tertiary === TertiaryEnums.end
      ) {
        const params = {
          id: dropNodeInfo.tertiary,
          name: TertiaryEnums[dropNodeInfo.tertiary],
          tertiary: dropNodeInfo.tertiary,
        };
        onCreate(params, position);
        return;
      }
      showCreateNode(
        currentBoard,
        { ...position, ...dropNodeInfo },
        (params?: any) => setExtra(params),
        showNodeModal,
        onCreate
      );
      setIsBoardCreateNode(true);
    },
    [reactFlowInstance]
  );

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

  const isValidConnection = (connection: any) => {
    return (
      nodeListRef.current?.find((item) => item.id === connection.target)
        ?.type === FlowNodeTypeEnums.default ||
      nodeListRef.current?.find((item) => item.id === connection.target)
        ?.type === FlowNodeTypeEnums.output
    );
  };

  const CustomNode = ({ data }: any) => {
    return (
      <>
        <Handle
          type="target"
          position={Position.Top}
          isValidConnection={isValidConnection}
        />
        <div>{data.label}</div>
        <Handle
          type="source"
          position={Position.Bottom}
          isValidConnection={isValidConnection}
        />
      </>
    );
  };

  const nodeTypes = useMemo(
    () => ({
      CustomNode: CustomNode,
    }),
    []
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
      if (!node?.position?.x || !node?.position?.y) {
        node.position = {
          x: graphNode.x,
          y: graphNode.y,
        };
      }
      newNodes.push(node);
    }
    return newNodes;
  }, []);

  const handleChangeNodes = useCallback(
    (nodeList: any[], edgeList: any[]) => {
      if (nodeList.length <= 0) {
        setNodes([]);
        return;
      }
      // Node
      const NodeList: any[] = [];
      const EdgeList: any[] = edgeList;
      for (const node of nodeList) {
        let type: any = FlowNodeTypeEnums.default;
        switch (node.tertiary) {
          case TertiaryEnums.start:
            type = FlowNodeTypeEnums.input;
            break;
          case TertiaryEnums.end:
            type = FlowNodeTypeEnums.output;
            break;
          default:
            type = FlowNodeTypeEnums.default;
            break;
        }

        // react-flow 组件 id 只支持 string 类型，如果不是 string 会出现许多 BUG，如：连接线不显示
        NodeList.push({
          id: node?.id?.toString(),
          type,
          data: {
            label: <BoardNode node={node} onDelete={onDeleteRight} />,
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

      setNodes(() => newNodes());
      nodeListRef.current = newNodes();
      setEdges(() => [...EdgeList]);
    },
    [boardNodes, boardEdges]
  );

  useEffect(() => {
    handleChangeNodes(boardNodes, boardEdges);
  }, [boardNodes, boardEdges]);

  return (
    <div
      style={{
        flex: 1,
        overflow: "hidden",
        backgroundColor: "#fff",
        position: "relative",
      }}
    >
      <div className="dndflow">
        <ReactFlowProvider>
          <div className="reactflow-wrapper" ref={BoardWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onSelectionChange={onSelectionChange}
              deleteKeyCode={null}
              multiSelectionKeyCode={null}
              onNodeDragStop={onNodeDragStop}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              attributionPosition="top-right"
              className="validationflow"
              onDrop={onDrop}
              onlyRenderVisibleElements
              onDragOver={onDragOver}
              fitView
              defaultZoom={0.5}
              nodesConnectable={!isLock}
              elementsSelectable={!isLock}
              nodesDraggable={!isLock}
            >
              <MiniMap />
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </div>
      {isLock && (
        <div
          style={{
            cursor: "no-drop",
            backgroundColor: "hsla(0,0%,0%,.1)",
            width: "100%",
            height: "100%",
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};
export default Board;
