import classNames from "classnames";
import { useMemo, useState } from "react";
import styles from "./index.less";
import {
  microsecondTimeStamp,
  nanosecondTimeUnitConversion,
} from "@/utils/time";
import {
  DownOutlined,
  ExclamationCircleFilled,
  RightOutlined,
} from "@ant-design/icons";
import ProgressBar from "./ProgressBar";
import ContentItem from "./ContentItem";

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
  const [isLogsHidden, setIsLogsHidden] = useState<boolean>(true);

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
          onClick={(e) => {
            e.stopPropagation();
            setIsHidden(!isHidden);
          }}
        >
          <ProgressBar
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
      <div
        className={classNames([styles.content, isHidden ? styles.none : ""])}
      >
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
                {nanosecondTimeUnitConversion(
                  log.rawLogJson?.duration.slice(0, -1) * 1000000
                )}
              </span>
              <span className={styles.color_gray}>
                &nbsp;|&nbsp;Start Time: &nbsp;
              </span>
              <span>
                {nanosecondTimeUnitConversion(
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
              <div
                className={styles.logsTitle}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLogsHidden(!isLogsHidden);
                }}
              >
                {isLogsHidden ? <RightOutlined /> : <DownOutlined />}
                Logs ({log?.rawLogJson?.logs?.length})
              </div>
              <div
                className={classNames([
                  styles.logsContent,
                  isLogsHidden && styles.none,
                ])}
              >
                {log?.rawLogJson?.logs &&
                  Object.keys(log?.rawLogJson?.logs).map((key: any) => {
                    const item = log?.rawLogJson?.logs[key];
                    return (
                      <ContentItem
                        key={key}
                        title={
                          <>
                            {nanosecondTimeUnitConversion(
                              microsecondTimeStamp(item.timestamp) - initial
                            )}
                          </>
                        }
                        list={log.rawLogJson?.process.tags}
                      />
                    );
                  })}
              </div>
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
