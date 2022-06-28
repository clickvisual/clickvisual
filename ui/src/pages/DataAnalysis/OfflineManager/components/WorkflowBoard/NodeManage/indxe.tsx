export interface NodeManageProps {
  board?: any;
  file?: any;
}
const NodeManage = ({ board, file }: NodeManageProps) => {
  const onDragStart = (event: any, nodeType: any) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };
  return (
    <div
      style={{
        flex: "0 0 180px",
        minHeight: 0,
        overflowY: "auto",
        borderRight: "1px solid hsla(0, 0%, 0%, 0.1)",
      }}
    >
      <aside>
        <div
          className="dndnode input"
          onDragStart={(event) => onDragStart(event, "input")}
          draggable
        >
          Input Node
        </div>
        <div
          className="dndnode"
          onDragStart={(event) => onDragStart(event, "default")}
          draggable
        >
          Default Node
        </div>
        <div
          className="dndnode output"
          onDragStart={(event) => onDragStart(event, "output")}
          draggable
        >
          Output Node
        </div>
      </aside>
    </div>
  );
};
export default NodeManage;
