import { useModel } from "@@/plugin-model/useModel";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import classNames from "classnames";
import { Empty } from "antd";
import LogItemDetail from "@/pages/DataLogs/utils/LogItemDetail";
import { useMemo } from "react";
import { parseJsonObject } from "@/utils/string";

interface MoreLogPopoverContentProps {
  log: any;
}
const MoreLogPopoverContent = ({ log }: MoreLogPopoverContentProps) => {
  const { logs } = useModel("dataLogs");
  const hiddenFields = logs?.hiddenFields || [];
  const { resultLog } = useMemo(() => LogItemDetail(logs, log), [logs, log]);
  if (hiddenFields.length <= 0)
    return (
      <>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </>
    );
  return (
    <div className={logItemStyles.details}>
      {hiddenFields.map((field, index) => (
        <div key={index} className={logItemStyles.logLine}>
          <div className={classNames(logItemStyles.logKey)}>
            <span>{field}</span>:
          </div>
          <span className={classNames(logItemStyles.logContent)}>
            {!!parseJsonObject(JSON.stringify(resultLog[field])) ? (
              <pre>{JSON.stringify(resultLog[field], null, 4)}</pre>
            ) : (
              JSON.stringify(resultLog[field])
            )}
          </span>
        </div>
      ))}
    </div>
  );
};
export default MoreLogPopoverContent;
