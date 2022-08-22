import { Button, Tooltip } from "antd";
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
      {logLibraryInfo.instanceName && (
        <span style={{ fontSize: "14px" }}>
          <Tooltip title={logLibraryInfo.instanceDesc}>
            {logLibraryInfo.instanceName}
          </Tooltip>
        </span>
      )}
      {logLibraryInfo.databaseName && (
        <span style={{ fontSize: "14px" }}>
          &nbsp;{separator || "/"}&nbsp;
          <Tooltip title={logLibraryInfo.databaseDesc}>
            {logLibraryInfo.databaseName}
          </Tooltip>
        </span>
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
          <Tooltip title={logLibraryInfo.tableDesc}>
            {logLibraryInfo.tableName}
          </Tooltip>
        </Button>
      )}
    </div>
  );
};
export default BreadCrumbs;
