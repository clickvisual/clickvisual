import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { Space } from "antd";
import CopyLog from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemOperation/CopyLog";
import MoreLog from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemOperation/MoreLog";

interface LogItemOperationProps {
  log: any;
}
const LogItemOperation = ({ log }: LogItemOperationProps) => {
  return (
    <div className={logItemStyles.operationLine}>
      <Space>
        <CopyLog log={log} />
        <MoreLog />
      </Space>
    </div>
  );
};

export default LogItemOperation;
