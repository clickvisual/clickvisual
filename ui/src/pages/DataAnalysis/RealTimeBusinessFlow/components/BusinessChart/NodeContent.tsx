import { BusinessChartResponse } from "@/services/realTimeTrafficFlow";
import { Tooltip } from "antd";

interface NodeContentProps {
  node: BusinessChartResponse;
}

const NodeContent = ({ node }: NodeContentProps) => {
  return (
    <Tooltip title={node.table}>
      <div
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <span>{node.table}</span>
      </div>
    </Tooltip>
  );
};

export default NodeContent;
