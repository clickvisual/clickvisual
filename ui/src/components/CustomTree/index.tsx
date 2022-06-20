import { Tree } from "antd";
import { TreeProps } from "antd/lib/tree/Tree";
import { useState } from "react";
import TreeStyle from "@/components/CustomTree/index.less";
import { DownOutlined } from "@ant-design/icons";

export enum NodeType {
  folder = "folder",
  node = "node",
}

export interface CustomTree extends TreeProps {
  onSelectNode?: (node: any) => void;
}

const CustomTree = (props: CustomTree) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const { onSelectNode } = props;
  const handleOnSelect = (selectedKeys: any, info: any) => {
    const { node } = info;
    if (node.nodeType === NodeType.folder) {
      if (expandedKeys.includes(node.key)) {
        setExpandedKeys(() => expandedKeys.filter((item) => item !== node.key));
      } else {
        setExpandedKeys(() => [node.key, ...expandedKeys]);
      }
      return;
    }
    onSelectNode?.(node);
  };

  return (
    <div className={TreeStyle.content}>
      <Tree
        showIcon
        blockNode
        switcherIcon={<DownOutlined />}
        onSelect={handleOnSelect}
        onExpand={handleOnSelect}
        expandedKeys={expandedKeys}
        {...props}
      />
    </div>
  );
};
export default CustomTree;
