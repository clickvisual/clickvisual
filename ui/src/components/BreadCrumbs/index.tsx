import { Button } from "antd";
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

  const getGoToQueryPagePath = (obj: { tid?: number; did?: number }) => {
    return `${QUERY_PATH}?${obj.tid ? "tid=" + obj.tid : "did=" + obj.did}`;
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
            window.open(
              getGoToQueryPagePath({ did: logLibraryInfo.did }),
              "_blank"
            )
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
            window.open(
              getGoToQueryPagePath({ tid: logLibraryInfo.tid }),
              "_blank"
            )
          }
        >
          &nbsp;{separator || "/"}&nbsp;
          {logLibraryInfo.tableDesc || logLibraryInfo.tableName}
        </Button>
      )}
    </div>
  );
};
export default BreadCrumbs;
