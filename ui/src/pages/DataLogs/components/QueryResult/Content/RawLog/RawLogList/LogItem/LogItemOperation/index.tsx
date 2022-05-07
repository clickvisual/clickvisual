import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import { Space } from "antd";
import CopyLog from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemOperation/CopyLog";
import MoreLog from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemOperation/MoreLog";

const LogItemOperation = () => {
  return (
    <div className={logItemStyles.operationLine}>
      <Space>
        <CopyLog />
        <MoreLog />
      </Space>
    </div>
  );
};

export default LogItemOperation;
