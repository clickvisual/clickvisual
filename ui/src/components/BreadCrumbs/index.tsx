import { Button } from "antd";
import { QUERY_PATH } from "@/config/config";
import { logLibraryInfoType } from "@/components/BreadCrumbs/type";
import { CSSProperties } from "react";
import { useIntl, useModel } from "umi";
interface BreadCrumbsProps {
  logLibraryInfo: logLibraryInfoType;
  style?: CSSProperties;
  separator?: string;
}

const BreadCrumbs = (props: BreadCrumbsProps) => {
  const i18n = useIntl();
  const { logLibraryInfo, style, separator } = props;
  const { onChangeVisibleDatabaseDraw } = useModel("dataLogs");

  const getGoToQueryPagePathByTid = (tid?: number) => {
    return `${QUERY_PATH}?tid=${tid}`;
  };

  const getGoToQueryPagePathByDid = (did?: number) => {
    return `${QUERY_PATH}?did=${did}`;
  };

  return (
    <div style={style}>
      {logLibraryInfo.instanceName && (
        <span style={{ fontSize: "14px" }}>
          {logLibraryInfo.instanceDesc || logLibraryInfo.instanceName}
        </span>
      )}
      {logLibraryInfo.databaseName && (
        <Button
          type={"link"}
          style={{ padding: 0 }}
          onClick={() =>
            window.open(getGoToQueryPagePathByDid(logLibraryInfo.did), "_blank")
          }
        >
          &nbsp;{separator || "/"}&nbsp;
          {logLibraryInfo.databaseDesc || logLibraryInfo.databaseName}
        </Button>
      )}
      {logLibraryInfo.tableName && (
        <Button
          type={"link"}
          style={{ padding: 0 }}
          onClick={() =>
            window.open(getGoToQueryPagePathByTid(logLibraryInfo.tid), "_blank")
          }
        >
          &nbsp;{separator || "/"}&nbsp;
          {logLibraryInfo.tableDesc || logLibraryInfo.tableName}
        </Button>
      )}
      {!logLibraryInfo.instanceName && (
        <span
          style={{
            lineHeight: "32px",
            cursor: "pointer",
            color: "hsl(21, 85%, 56%)",
          }}
          onClick={() => onChangeVisibleDatabaseDraw(true)}
        >
          {i18n.formatMessage({
            id: "alarm.rules.selected.placeholder.database",
          })}
        </span>
      )}
    </div>
  );
};
export default BreadCrumbs;
