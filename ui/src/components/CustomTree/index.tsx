import { DataNode } from "antd/lib/tree";
import { Tree } from "antd";

export interface CustomTreeProps {
  treeData: DataNode[];
  RightMenus?: HTMLElement;
}

const CustomTree = (props: CustomTreeProps) => {
  const { treeData } = props;
  return (
    <Tree
      treeData={treeData}
      onSelect={(selectedKeys, { node }) => {}}
      onRightClick={({ node }) => {
        console.log("node: ", node);
      }}
    />
  );
};

export default CustomTree;
