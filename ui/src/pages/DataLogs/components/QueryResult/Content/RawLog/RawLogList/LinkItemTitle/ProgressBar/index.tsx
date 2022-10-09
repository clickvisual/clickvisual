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
    let errList: any[] = [];
    if (log?.rawLogJson?.logs && log?.rawLogJson?.logs.length > 0) {
      log?.rawLogJson?.logs.map((item: any) => {
        errList.push({
          relativeTime: item.timestamp
            ? (microsecondTimeStamp(item.timestamp) - initial) / totalLength
            : false,
          absoluteTime: item.timestamp,
        });
      });
    }
    return errList;
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
      {errLocation &&
        errLocation.length > 0 &&
        errLocation.map((item: any) => {
          return (
            <>
              <Tooltip
                // title={<LogsItem isTips log={log} initial={initial} />}
                title={microsecondsTimeUnitConversion(
                  microsecondTimeStamp(item.absoluteTime) - initial
                )}
                color="#fff"
                // overlayInnerStyle={{ width: "1000px", color: "#000" }}
                overlayInnerStyle={{ color: "#000" }}
                // autoAdjustOverflow={false}
              >
                <span
                  className={styles.errorLine}
                  style={{
                    left:
                      log?.rawLogJson?.logs && log?.rawLogJson?.logs.length
                        ? item.relativeTime * 100 + "%"
                        : "-100%",
                  }}
                >
                  |
                </span>
              </Tooltip>
            </>
          );
        })}
    </div>
  );
};

export default ProgressBar;
