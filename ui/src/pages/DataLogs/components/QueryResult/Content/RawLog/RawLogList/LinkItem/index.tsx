import styles from "./index.less";
import CalibrationRight from "./CalibrationRight";
import LinkTree from "./LinkTree";
import { useEffect, useState } from "react";
import { microsecondTimeStamp } from "@/utils/time";

interface LinkItemProps {
  log: any;
}

const LinkItem = (props: LinkItemProps) => {
  const { log } = props;
  const [endTime, setEndTime] = useState<number>(0);

  useEffect(() => {
    let endTime: number = 0;
    handleGetTotalLength([log], []).map((item: any) => {
      if (item > endTime) {
        endTime = item;
      }
    });
    setEndTime(endTime);
  }, [log]);

  const handleGetTotalLength = (list: any[], arr: any[]) => {
    list.map((item: any) => {
      arr.push(
        item?.data?.rawLogJson?.duration.slice(0, -1) * Math.pow(10, 6) +
          microsecondTimeStamp(item?.data?.rawLogJson?.startTime)
      );
      if (item.children.length > 0) {
        handleGetTotalLength(item.children, arr);
      }
    });
    return arr;
  };

  return (
    <div className={styles.linkItem}>
      <div className={styles.calibration}>
        <div className={styles.calibrationLeft}>{"Service & Operation"}</div>
        <CalibrationRight
          endTime={endTime}
          startTime={microsecondTimeStamp(log?.data?.rawLogJson?.startTime)}
        />
      </div>
      <div className={styles.linkContent}>
        <div className={styles.linkTree}>
          <LinkTree log={log} />
        </div>
      </div>
    </div>
  );
};
export default LinkItem;
