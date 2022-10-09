import {
  microsecondsTimeUnitConversion,
  microsecondTimeStamp,
} from "@/utils/time";
import { RightOutlined, DownOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { useState } from "react";
import ContentItem from "../ContentItem";
import styles from "./index.less";

const LogsItem = ({
  log,
  initial,
  isTips = false,
}: {
  log: any;
  initial: any;
  isTips?: boolean;
}) => {
  const [isLogsHidden, setIsLogsHidden] = useState<boolean>(!isTips);

  return (
    <>
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
        {log?.rawLogJson?.logs?.map((item: any, index: number) => {
          return (
            <ContentItem
              key={index}
              isTips={isTips}
              title={
                <>
                  {microsecondsTimeUnitConversion(
                    microsecondTimeStamp(item.timestamp) - initial
                  )}
                </>
              }
              list={item?.fields}
            />
          );
        })}
      </div>
    </>
  );
};
export default LogsItem;
