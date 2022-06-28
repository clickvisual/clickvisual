import {
  FolderOpenOutlined,
  FolderOutlined,
  ClusterOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import SqlIcon from "@/assets/images/sql.svg";

export enum TreeNodeTypeEnums {
  closeFolder = "closeFolder",
  openFolder = "openFolder",
  workflow = "workflow",
  node = "node",
  sql = "sql",
}
export interface TreeNodesIconProps {
  type: TreeNodeTypeEnums;
}

const TreeNodeTypeIcon = ({ type }: TreeNodesIconProps) => {
  switch (type) {
    case TreeNodeTypeEnums.closeFolder:
      return <FolderOutlined />;
    case TreeNodeTypeEnums.openFolder:
      return <FolderOpenOutlined />;
    case TreeNodeTypeEnums.workflow:
      return <ClusterOutlined />;
    case TreeNodeTypeEnums.node:
      return <FileTextOutlined />;
    case TreeNodeTypeEnums.sql:
      return (
        <img
          src={SqlIcon}
          style={{ display: "inline-block", width: 16, height: 16 }}
          alt={"sql"}
        />
      );

    default:
      return <></>;
  }
};
export default TreeNodeTypeIcon;
