import {
  FolderOpenOutlined,
  FolderOutlined,
  ClusterOutlined,
} from "@ant-design/icons";

export enum TreeNodeTypeEnums {
  closeFolder = "closeFolder",
  openFolder = "openFolder",
  workflow = "workflow",
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
    default:
      return <></>;
  }
};
export default TreeNodeTypeIcon;
