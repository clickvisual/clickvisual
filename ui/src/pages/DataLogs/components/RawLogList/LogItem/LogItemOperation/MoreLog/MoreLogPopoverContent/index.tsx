import { useModel } from "@@/plugin-model/useModel";
import { LogItemContext } from "@/pages/DataLogs/components/RawLogList";
import { useContext } from "react";
import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import classNames from "classnames";
import { Empty } from "antd";

type MoreLogPopoverProps = {};
const MoreLogPopoverContent = ({}: MoreLogPopoverProps) => {
  const { logs } = useModel("dataLogs");
  const { log } = useContext(LogItemContext);
  const hiddenFields = logs?.hiddenFields || [];
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
          <span
            className={classNames(
              logItemStyles.logContent,
              logItemStyles.logHover
            )}
          >
            {log[field]}
          </span>
        </div>
      ))}
    </div>
  );
};
export default MoreLogPopoverContent;
