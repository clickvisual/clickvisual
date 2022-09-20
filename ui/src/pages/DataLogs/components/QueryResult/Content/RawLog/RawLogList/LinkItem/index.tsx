import styles from "./index.less";
import CalibrationRight from "./CalibrationRight";
import LinkTree from "./LinkTree";
import { useEffect, useState } from "react";
import { microsecondTimeStamp } from "@/utils/time";
import LinkLogInfo from "./LinkLogInfo";

interface LinkItemProps {
  log: any;
}

const LinkItem = (props: LinkItemProps) => {
  const { log } = props;
  const [endTime, setEndTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    let endTime: number = 0;
    let startTime: number = 0;
    handleGetTotalLength([log], []).map((item: any, index: number) => {
      if (item.et > endTime) {
        endTime = item.et;
      }

      if (index == 0 || item.st < startTime) {
        startTime = item.st;
      }
    });
    setEndTime(endTime);
    setStartTime(startTime);
  }, [log]);

  const handleGetTotalLength = (list: any[], arr: any[]) => {
    list.map((item: any) => {
      arr.push({
        et:
          item?.data?.rawLogJson?.duration.slice(0, -1) * Math.pow(10, 6) +
          microsecondTimeStamp(item?.data?.rawLogJson?.startTime),
        st: microsecondTimeStamp(item?.data?.rawLogJson?.startTime),
      });
      if (item.children.length > 0) {
        handleGetTotalLength(item.children, arr);
      }
    });
    return arr;
  };

  return (
    <div className={styles.linkItem}>
      <LinkLogInfo log={log} />
      <div className={styles.calibration}>
        <div className={styles.calibrationLeft}>{"Service & Operation"}</div>
        <CalibrationRight endTime={endTime} startTime={startTime} />
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
