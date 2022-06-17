import { FolderOutlined, FolderOpenOutlined } from "@ant-design/icons";

export enum NodeTypeEnums {
  closeFolder = "closeFolder",
  openFolder = "openFolder",
}
export interface NodeTypesIconProps {
  type: NodeTypeEnums;
}
const NodeTypesIcon = ({ type }: NodeTypesIconProps) => {
  switch (type) {
    case NodeTypeEnums.closeFolder:
      return <FolderOutlined />;
    case NodeTypeEnums.openFolder:
      return <FolderOpenOutlined />;
    default:
      return <></>;
  }
};
export default NodeTypesIcon;
