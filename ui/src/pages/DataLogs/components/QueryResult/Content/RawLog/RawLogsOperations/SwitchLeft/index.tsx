import { Space } from "antd";
import HistogramSwitch from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/HistogramSiwtch";
import FoldingExpansionSwitch from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/FoldingExpansionSwitch";
import HiddenFields from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogsOperations/SwitchLeft/HiddenFields";
import { PaneType } from "@/models/datalogs/types";

const SwitchLeft = (props: { oldPane: PaneType | undefined }) => {
  return (
    <Space>
      <HistogramSwitch {...props} />
      <FoldingExpansionSwitch {...props} />
      <HiddenFields {...props} />
    </Space>
  );
};
export default SwitchLeft;
