import {
  microsecondsTimeUnitConversion,
  microsecondTimeStamp,
} from "@/utils/time";
import moment from "moment";
import { useMemo } from "react";
import styles from "./index.less";

const LinkLogInfo = (props: { log: any }) => {
  const { log } = props;

  const depth = useMemo(() => {
    let defaultHierarchy = 1;

    const aa = (log: any, hierarchy: number) => {
      log.map((item: any) => {
        if (item?.children && item?.children.length > 0) {
          aa(item.children, hierarchy + 1);
        } else {
          if (defaultHierarchy < hierarchy) {
            defaultHierarchy = hierarchy;
          }
        }
      });
    };
    aa([log], defaultHierarchy);

    return defaultHierarchy;
  }, [log]);

  const time = useMemo(() => {
    if (log?.data?.rawLogJson?.startTime) {
      const time = microsecondTimeStamp(log?.data?.rawLogJson?.startTime);
      return moment(time / Math.pow(10, 3)).format("YYYY-MM-DD HH:mm:ss.SSS");
    }

    return 0;
  }, [log?.data?.rawLogJson?.startTime]);

  return (
    <div className={styles.linkLogInfo}>
      <span className={styles.linkLogInfoItem}>
        <span className={styles.linkLogInfoItemTitle}>Trace Start: </span>
        <span className={styles.linkLogInfoItemContent}>{time}</span>
      </span>
      <span className={styles.linkLogInfoItem}>
        <span className={styles.linkLogInfoItemTitle}>Duration: </span>
        <span className={styles.linkLogInfoItemContent}>
          {log?.duration && microsecondsTimeUnitConversion(log?.duration)}
        </span>
      </span>
      <span className={styles.linkLogInfoItem}>
        <span className={styles.linkLogInfoItemTitle}>Services: </span>
        <span className={styles.linkLogInfoItemContent}>{log?.services} </span>
      </span>
      <span className={styles.linkLogInfoItem}>
        <span className={styles.linkLogInfoItemTitle}>Depth: </span>
        <span className={styles.linkLogInfoItemContent}>{depth} </span>
      </span>
      <span className={styles.linkLogInfoItem}>
        <span className={styles.linkLogInfoItemTitle}>Total Spans: </span>
        <span className={styles.linkLogInfoItemContent}>
          {log?.totalSpans}{" "}
        </span>
      </span>
    </div>
  );
};
export default LinkLogInfo;
