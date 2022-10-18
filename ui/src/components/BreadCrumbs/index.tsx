import styles from "./index.less";
import { Tooltip } from "antd";
import { QUERY_PATH } from "@/config/config";
import { logLibraryInfoType } from "@/components/BreadCrumbs/type";
import { CSSProperties, useEffect, useState } from "react";
import { getTextWith } from "@/utils/textWith";
import { relatedListType } from "@/services/alarm";
interface BreadCrumbsProps {
  logLibraryInfo: logLibraryInfoType;
  style?: CSSProperties;
  separator?: string;
}

const BreadCrumbs = (props: BreadCrumbsProps) => {
  const { logLibraryInfo, style, separator } = props;
  const [tableWidth, setTableWidth] = useState<number>(115);

  const getGoToQueryPagePathByTid = (tid?: number) => {
    return `${QUERY_PATH}?tid=${tid}`;
  };

  useEffect(() => {
    // 将实例、数据库的文字放到canvas里面，获取文本的长度，然后计算table字段最多还能占据的长度
    const instanceWidth =
      (getTextWith(logLibraryInfo.instanceName) || 0) > 115
        ? 115
        : getTextWith(logLibraryInfo.instanceName) || 0;

    const databaseWidth =
      (getTextWith(logLibraryInfo.databaseName) || 0) > 115
        ? 115
        : getTextWith(logLibraryInfo.databaseName) || 0;

    setTableWidth(325 - instanceWidth - databaseWidth);
  }, [logLibraryInfo]);

  return (
    <>
      {logLibraryInfo?.relatedList?.map((item: relatedListType) => {
        return (
          <div style={style || { whiteSpace: "nowrap" }} key={item.table.id}>
            <Tooltip
              title={
                <>
                  <p>
                    instance:&nbsp;
                    {item?.instance?.desc || item?.instance?.name || "unknown"}
                  </p>
                  <p>
                    database:&nbsp;
                    {item?.table?.database?.desc ||
                      item?.table?.database?.name ||
                      "unknown"}
                  </p>
                  <p>
                    table:&nbsp;
                    <a
                      href={getGoToQueryPagePathByTid(item?.table?.id)}
                      target="_blank"
                    >
                      {item?.table?.desc || item?.table?.name || "unknown"}
                    </a>
                  </p>
                </>
              }
            >
              {logLibraryInfo.instanceName && (
                <span className={styles.nameSpan}>{item?.instance?.name}</span>
              )}
              {logLibraryInfo.databaseName && (
                <>
                  <span className={styles.nameSpan}>
                    &nbsp;{separator || "/"}&nbsp;
                  </span>
                  <span className={styles.nameSpan}>
                    {item?.table?.database?.name}
                  </span>
                </>
              )}
              {logLibraryInfo.tableName && (
                <>
                  <span className={styles.nameSpan}>
                    &nbsp;{separator || "/"}&nbsp;
                  </span>
                  <span
                    className={styles.nameSpan}
                    style={{ maxWidth: tableWidth + "px" }}
                  >
                    <a
                      href={getGoToQueryPagePathByTid(item?.table?.id)}
                      target="_blank"
                    >
                      {item?.table?.name}
                    </a>
                  </span>
                </>
              )}
            </Tooltip>
          </div>
        );
      })}
    </>
  );
};
export default BreadCrumbs;
