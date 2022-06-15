import { Space } from "antd";
import HistogramSwitch from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/HistogramSiwtch";
import FoldingExpansionSwitch from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/FoldingExpansionSwitch";

const SwitchLeft = () => {
  return (
    <Space>
      <HistogramSwitch />
      <FoldingExpansionSwitch />
    </Space>
  );
};
export default SwitchLeft;
