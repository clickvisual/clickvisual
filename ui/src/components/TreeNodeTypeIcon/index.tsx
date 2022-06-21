import {
  FolderOpenOutlined,
  FolderOutlined,
  ClusterOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

export enum TreeNodeTypeEnums {
  closeFolder = "closeFolder",
  openFolder = "openFolder",
  workflow = "workflow",
  node = "node",
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
    default:
      return <></>;
  }
};
export default TreeNodeTypeIcon;
