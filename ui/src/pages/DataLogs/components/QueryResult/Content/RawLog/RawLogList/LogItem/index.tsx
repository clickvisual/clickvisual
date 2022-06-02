import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import LogItemOperation from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemOperation";
import LogItemDetails from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemDetails";
import moment from "moment";
import { LogItemContext } from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList";
import { useContext, useState } from "react";
import LogItemFold from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemFold";
import { CaretDownOutlined, CaretRightOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useDebounceFn } from "ahooks";
import { DEBOUNCE_WAIT } from "@/config/config";

const LogItem = () => {
  const { log } = useContext(LogItemContext);
  // 是否折叠日志，true 为是，false 为否
  const [isFold, setIsFold] = useState<boolean>(true);

  const handleFoldClick = useDebounceFn(() => setIsFold(() => !isFold), {
    wait: DEBOUNCE_WAIT,
  }).run;

  return (
    <div className={logItemStyles.logItemMain}>
      <div className={logItemStyles.left}>
        <div>
          <Button
            size={"small"}
            type={"link"}
            onClick={handleFoldClick}
            icon={isFold ? <CaretRightOutlined /> : <CaretDownOutlined />}
          />
        </div>
        <div className={logItemStyles.dateTime}>
          <div>
            {moment(log._time_nanosecond_ || log._time_second_).format(
              "MM-DD HH:mm:ss.SSS"
            )}
          </div>
          <LogItemOperation />
        </div>
      </div>
      <div className={logItemStyles.right}>
        {isFold ? (
          <LogItemFold onFoldClick={handleFoldClick} />
        ) : (
          <LogItemDetails />
        )}
      </div>
    </div>
  );
};

export default LogItem;
