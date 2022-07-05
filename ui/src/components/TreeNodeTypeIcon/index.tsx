import {
  ClusterOutlined,
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import SVGIcon, { SVGTypeEnums } from "@/components/SVGIcon";

export enum TreeNodeTypeEnums {
  closeFolder = "closeFolder",
  openFolder = "openFolder",
  workflow = "workflow",
  realtime = "realtime",
  mysql = "mysql",
  clickhouse = "clickhouse",
}
export interface TreeNodesIconProps {
  type: TreeNodeTypeEnums | null;
}

const TreeNodeTypeIcon = ({ type }: TreeNodesIconProps) => {
  switch (type) {
    case TreeNodeTypeEnums.closeFolder:
      return <FolderOutlined />;
    case TreeNodeTypeEnums.openFolder:
      return <FolderOpenOutlined />;
    case TreeNodeTypeEnums.workflow:
      return <ClusterOutlined />;
    case TreeNodeTypeEnums.realtime:
      return <SVGIcon type={SVGTypeEnums.realtime} />;
    case TreeNodeTypeEnums.clickhouse:
      return <SVGIcon type={SVGTypeEnums.clickhouse} />;
    case TreeNodeTypeEnums.mysql:
      return <SVGIcon type={SVGTypeEnums.mysql} />;
    default:
      return <FileOutlined />;
  }
};
export default TreeNodeTypeIcon;
