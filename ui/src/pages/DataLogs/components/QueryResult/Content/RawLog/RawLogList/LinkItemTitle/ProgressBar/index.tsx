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
      <div
        className={styles.duration}
        data-left-time={percentageStart > 0.5 ? duration.toFixed(2) + "us" : ""}
        data-right-time={
          percentageStart < 0.5 ? duration.toFixed(2) + "us" : ""
        }
        style={{
          marginLeft: percentageStart * 100 + "%",
          width: percentageLength * 100 + "%",
          background: themeColor,
        }}
      ></div>
    </div>
  );
};

export default ProgressBar;
