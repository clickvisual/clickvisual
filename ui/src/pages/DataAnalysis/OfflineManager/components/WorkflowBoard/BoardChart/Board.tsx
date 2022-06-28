import { useCallback, useRef, useState } from "react";
import ReactFlow, { addEdge, ReactFlowProvider } from "react-flow-renderer";

import "./styles/index.less";
import { useModel } from "@@/plugin-model/useModel";

let id = 0;
const getId = () => `dndNode_${id++}`;
const Board = () => {
  const reactFlowWrapper = useRef<any>(null);
  const { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange } =
    useModel("dataAnalysis", (model) => ({
      nodes: model.workflowBoard.nodes,
      setNodes: model.workflowBoard.setNodes,
      onNodesChange: model.workflowBoard.onNodesChange,
      edges: model.workflowBoard.edges,
      setEdges: model.workflowBoard.setEdges,
      onEdgesChange: model.workflowBoard.onEdgesChange,
    }));

  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  return (
    <div className="dndflow">
      <ReactFlowProvider>
        <div className="reactflow-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            attributionPosition="top-right"
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
          />
        </div>
      </ReactFlowProvider>
    </div>
  );
};
export default Board;
