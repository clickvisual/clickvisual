import { Space } from "antd";
import HistogramSwitch from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/HistogramSiwtch";
import FoldingExpansionSwitch from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/FoldingExpansionSwitch";
import HiddenFields from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/HiddenFields";

const SwitchLeft = () => {
  return (
    <Space>
      <HistogramSwitch />
      <FoldingExpansionSwitch />
      <HiddenFields />
    </Space>
  );
};
export default SwitchLeft;
