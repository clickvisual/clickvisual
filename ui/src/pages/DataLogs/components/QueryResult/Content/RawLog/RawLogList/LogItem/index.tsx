import logItemStyles from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/index.less";
import LogItemOperation from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemOperation";
import LogItemDetails from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemDetails";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import LogItemFold from "@/pages/DataLogs/components/QueryResult/Content/RawLog/RawLogList/LogItem/LogItemFold";
import { CaretDownOutlined, CaretRightOutlined } from "@ant-design/icons";
import { Button } from "antd";

interface LogItemProps {
  log: any;
  foldingChecked?: boolean;
}
const LogItem = ({ log, foldingChecked }: LogItemProps) => {
  // 是否折叠日志，true 为是，false 为否
  const [isFold, setIsFold] = useState<boolean>(true);

  const handleFoldClick = () => setIsFold(() => !isFold);
  useEffect(() => {
    setIsFold(foldingChecked ?? true);
  }, [foldingChecked]);

  const time = useMemo(() => {
    if (log._time_nanosecond_) {
      return moment(log._time_nanosecond_).format("MM-DD HH:mm:ss.SSS");
    }
    if (log._time_second_) {
      return moment.unix(log._time_second_).format("MM-DD HH:mm:ss");
    }

    return "";
  }, [log._time_nanosecond_, log._time_second_]);

  return (
    <div className={logItemStyles.logItemMain}>
      <div className={logItemStyles.left}>
        <div className={logItemStyles.flexBox}>
          <Button
            size={"small"}
            type={"link"}
            onClick={handleFoldClick}
            style={{ height: "19px" }}
            icon={isFold ? <CaretRightOutlined /> : <CaretDownOutlined />}
          />
        </div>
        <div className={logItemStyles.dateTime}>
          <div>{time}</div>
          <LogItemOperation log={log} />
        </div>
      </div>
      <div className={logItemStyles.right}>
        {isFold ? (
          <LogItemFold onFoldClick={handleFoldClick} log={log} />
        ) : (
          <LogItemDetails foldingChecked={foldingChecked} log={log} />
        )}
      </div>
    </div>
  );
};

export default LogItem;
