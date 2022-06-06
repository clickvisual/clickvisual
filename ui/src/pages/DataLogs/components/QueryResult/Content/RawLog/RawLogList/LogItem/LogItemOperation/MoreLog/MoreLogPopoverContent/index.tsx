import { useModel } from "@@/plugin-model/useModel";
import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import classNames from "classnames";
import { Empty } from "antd";
interface MoreLogPopoverContentProps {
  log: any;
}
const MoreLogPopoverContent = ({ log }: MoreLogPopoverContentProps) => {
  const { logs } = useModel("dataLogs");
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
          <span className={classNames(logItemStyles.logContent)}>
            {log[field]}
          </span>
        </div>
      ))}
    </div>
  );
};
export default MoreLogPopoverContent;
