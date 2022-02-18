import logItemStyles from "@/pages/DataLogs/components/RawLogList/LogItem/index.less";
import LogItemOperation from "@/pages/DataLogs/components/RawLogList/LogItem/LogItemOperation";
import LogItemDetails from "@/pages/DataLogs/components/RawLogList/LogItem/LogItemDetails";
import { useModel } from "@@/plugin-model/useModel";
import moment from "moment";
import { LogItemContext } from "@/pages/DataLogs/components/RawLogList";
import { useContext } from "react";

type LogItemProps = {
  index: number;
};
const LogItem = (props: LogItemProps) => {
  const { index } = props;
  const { currentPage, pageSize } = useModel("dataLogs");
  const { log } = useContext(LogItemContext);

  return (
    <div className={logItemStyles.logItemMain}>
      <div className={logItemStyles.left}>
        <div className={logItemStyles.logIndex}>
          {(pageSize as number) * ((currentPage as number) - 1) + index + 1}
        </div>
        <div>
          <div className={logItemStyles.dateTime}>
            {moment(log._time_nanosecond_).format("MM-DD HH:mm:ss.SSS")}
          </div>
          <LogItemOperation />
        </div>
      </div>
      <div className={logItemStyles.right}>
        <LogItemDetails />
      </div>
    </div>
  );
};

export default LogItem;
