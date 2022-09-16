import {
  microsecondsTimeUnitConversion,
  microsecondTimeStamp,
} from "@/utils/time";
import { Tooltip } from "antd";
import { useMemo } from "react";
// import LogsItem from "../LogsItem";
import styles from "./index.less";

const ProgressBar = (props: {
  log: any;
  start: any;
  totalLength: any;
  initial: any;
  duration: number;
  themeColor: string;
}) => {
  const { start, totalLength, initial, duration, themeColor, log } = props;

  const percentageLength = useMemo(() => {
    return duration / totalLength;
  }, [totalLength, duration]);

  const percentageStart = useMemo(() => {
    return (start - initial) / totalLength;
  }, [start, initial, totalLength]);

  const errLocation = useMemo(() => {
    return (
      log?.rawLogJson?.logs &&
      (microsecondTimeStamp(log?.rawLogJson?.logs[0]?.timestamp) - initial) /
        totalLength
    );
  }, [log?.rawLogJson?.logs]);

  return (
    <div className={styles.progressBar}>
      <Tooltip title={microsecondsTimeUnitConversion(duration)} placement="top">
        <div
          className={styles.duration}
          data-left-time={
            percentageStart > 0.5
              ? microsecondsTimeUnitConversion(duration)
              : ""
          }
          data-right-time={
            percentageStart < 0.5
              ? microsecondsTimeUnitConversion(duration)
              : ""
          }
          style={{
            marginLeft: percentageStart * 100 + "%",
            width: percentageLength * 100 + "%",
            background: themeColor,
          }}
        />
      </Tooltip>
      {/* <Tooltip
        title={<LogsItem log={log} initial={initial} />}
        color="#FFF"
        overlayStyle={{ width: "800px" }}
      > */}
      <span
        className={styles.errorLine}
        style={{
          left:
            log?.rawLogJson?.logs && log?.rawLogJson?.logs.length
              ? errLocation * 100 + "%"
              : "-100%",
        }}
      >
        |
      </span>
      {/* </Tooltip> */}
    </div>
  );
};

export default ProgressBar;
