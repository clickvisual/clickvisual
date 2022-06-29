import { useEdgesState, useNodesState } from "react-flow-renderer";

const useWorkflowBoard = () => {
  const initialNodes = [
    {
      id: "1",
      type: "input",
      data: { label: "input node" },
      position: { x: 250, y: 5 },
    },
  ];
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  return {
    nodes,
    edges,

    setNodes,
    setEdges,

    onNodesChange,
    onEdgesChange,
  };
};
export default useWorkflowBoard;
