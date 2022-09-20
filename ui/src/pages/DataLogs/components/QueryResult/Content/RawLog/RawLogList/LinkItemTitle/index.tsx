import { useMemo, useState } from "react";
import styles from "./index.less";
import { ExclamationCircleFilled } from "@ant-design/icons";
import ProgressBar from "./ProgressBar";
import ContentItem from "./ContentItem";
import LogsItem from "./LogsItem";
import classNames from "classnames";
import {
  microsecondTimeStamp,
  microsecondsTimeUnitConversion,
} from "@/utils/time";
import { useModel } from "umi";

const LinkItemTitle = (props: {
  title: any;
  log: any;
  initial: number;
  totalLength: any;
  hierarchy: number;
  themeColor: string;
}) => {
  const { title, log, initial, totalLength, hierarchy, themeColor } = props;
  const [isHidden, setIsHidden] = useState<boolean>(true);
  const { foldingState, resizeMenuWidth } = useModel("dataLogs", (model) => ({
    foldingState: model.foldingState,
    resizeMenuWidth: model.resizeMenuWidth,
  }));

  const titleWidth = useMemo(() => {
    return `calc(15vw - ${24 * hierarchy + 4}px)`;
  }, [hierarchy]);

  const titleContentWidth = useMemo(() => {
    return `calc(15vw - ${24 * hierarchy}px)`;
  }, [hierarchy]);

  return (
    <div
      className={styles.linkItemTitle}
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{ backgroundColor: themeColor }}
    >
      <div className={styles.header}>
        <div
          className={styles.title}
          style={{
            width: titleWidth,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsHidden(!isHidden);
          }}
        >
          {log?.rawLogJson?.logs && (
            <ExclamationCircleFilled style={{ color: "#fb2828" }} />
          )}
          &nbsp;
          {title}
        </div>
        <div
          className={classNames([
            styles.progress,
            !isHidden && styles.topBorder,
          ])}
          style={{
            width: `calc(85vw - ${
              !foldingState ? resizeMenuWidth : -10
            }px -  293px)`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsHidden(!isHidden);
          }}
        >
          <ProgressBar
            log={log}
            initial={initial}
            start={microsecondTimeStamp(log.rawLogJson?.startTime)}
            totalLength={totalLength}
            duration={log.rawLogJson?.duration.slice(0, -1) * 1000000}
            themeColor={themeColor}
          />
          <div className={styles.ticks}>
            <span className={styles.ticksTick}></span>
            <span className={styles.ticksTick}></span>
            <span className={styles.ticksTick}></span>
            <span className={styles.ticksTick}></span>
          </div>
        </div>
      </div>
      <div className={classNames([styles.content, isHidden && styles.none])}>
        <div
          className={styles.titleContent}
          style={{
            width: titleContentWidth,
            backgroundColor: "#FFF",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsHidden(!isHidden);
          }}
        ></div>
        <div
          className={styles.progressContent}
          style={{ borderTop: "2px solid " + themeColor }}
        >
          <div className={styles.progressContentTitle}>
            <div>{log.rawLogJson?.operationName}</div>
            <div>
              <span className={styles.color_gray}>Service: &nbsp;</span>
              <span>{log.rawLogJson?.process?.serviceName}</span>
              <span className={styles.color_gray}>
                &nbsp;|&nbsp;Duration: &nbsp;
              </span>
              <span>
                {microsecondsTimeUnitConversion(
                  log.rawLogJson?.duration.slice(0, -1) * 1000000
                )}
              </span>
              <span className={styles.color_gray}>
                &nbsp;|&nbsp;Start Time: &nbsp;
              </span>
              <span>
                {microsecondsTimeUnitConversion(
                  microsecondTimeStamp(log.rawLogJson?.startTime) - initial
                )}
              </span>
            </div>
          </div>
          <div className={styles.progressContentList}>
            <div className={styles.progressContentItem}>
              <ContentItem title={"Tags"} list={log.rawLogJson?.tags} />
            </div>
            <div className={styles.progressContentItem}>
              <ContentItem
                title={"Process"}
                list={log.rawLogJson?.process.tags}
              />
            </div>
            <div
              className={classNames([
                styles.progressLogs,
                !log?.rawLogJson?.logs && styles.none,
              ])}
            >
              <LogsItem log={log} initial={initial} />
            </div>
          </div>
          <div className={styles.bottomInfo} data-text="SpanID: ">
            {log?.rawLogJson?.spanId}
          </div>
        </div>
      </div>
    </div>
  );
};
export default LinkItemTitle;
