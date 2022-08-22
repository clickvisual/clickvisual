import styles from "./index.less";
import { Tooltip } from "antd";
import { QUERY_PATH } from "@/config/config";
import { logLibraryInfoType } from "@/components/BreadCrumbs/type";
import { CSSProperties } from "react";
interface BreadCrumbsProps {
  logLibraryInfo: logLibraryInfoType;
  style?: CSSProperties;
  separator?: string;
}

const BreadCrumbs = (props: BreadCrumbsProps) => {
  const { logLibraryInfo, style, separator } = props;

  const getGoToQueryPagePathByTid = (tid?: number) => {
    return `${QUERY_PATH}?tid=${tid}`;
  };

  return (
    <div style={style}>
      <Tooltip
        title={
          <>
            <p>
              instance:&nbsp;
              {logLibraryInfo.instanceDesc ||
                logLibraryInfo.instanceName ||
                "unknown"}
            </p>
            <p>
              database:&nbsp;
              {logLibraryInfo?.databaseDesc ||
                logLibraryInfo.databaseName ||
                "unknown"}
            </p>
            <p>
              table:&nbsp;
              <a
                href={getGoToQueryPagePathByTid(logLibraryInfo.tid)}
                target="_blank"
              >
                {logLibraryInfo.tableDesc ||
                  logLibraryInfo.tableName ||
                  "unknown"}
              </a>
            </p>
          </>
        }
      >
        {logLibraryInfo.instanceName && (
          <span className={styles.nameSpan}>{logLibraryInfo.instanceName}</span>
        )}
        {logLibraryInfo.databaseName && (
          // <Tooltip title={logLibraryInfo.databaseDesc}>
          <span className={styles.nameSpan}>
            &nbsp;{separator || "|"}&nbsp;
            {logLibraryInfo.databaseName}
          </span>
        )}
        {logLibraryInfo.tableName && (
          // <Tooltip title={logLibraryInfo.tableDesc}>
          <span className={styles.nameSpan}>
            &nbsp;{separator || "|"}&nbsp;
            <a
              href={getGoToQueryPagePathByTid(logLibraryInfo.tid)}
              target="_blank"
            >
              {logLibraryInfo.tableName}
            </a>
          </span>
        )}
      </Tooltip>
    </div>
  );
};
export default BreadCrumbs;
