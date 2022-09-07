import { nanosecondTimeUnitConversion } from "@/utils/time";
import { Tooltip } from "antd";
import { useMemo } from "react";
import styles from "./index.less";

const ProgressBar = (props: {
  start: any;
  totalLength: any;
  initial: any;
  duration: number;
  themeColor: string;
}) => {
  const { start, totalLength, initial, duration, themeColor } = props;

  const percentageLength = useMemo(() => {
    return duration / totalLength;
  }, [totalLength, duration]);

  const percentageStart = useMemo(() => {
    return (start - initial) / totalLength;
  }, [start, initial, totalLength]);

  return (
    <div style={{ width: "100%" }}>
      <Tooltip title={nanosecondTimeUnitConversion(duration)} placement="top">
        <div
          className={styles.duration}
          data-left-time={
            percentageStart > 0.5 ? nanosecondTimeUnitConversion(duration) : ""
          }
          data-right-time={
            percentageStart < 0.5 ? nanosecondTimeUnitConversion(duration) : ""
          }
          style={{
            marginLeft: percentageStart * 100 + "%",
            width: percentageLength * 100 + "%",
            background: themeColor,
          }}
        />
      </Tooltip>
    </div>
  );
};

export default ProgressBar;
