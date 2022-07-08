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
  selectKeys?: any;
}

const CustomTree = (props: CustomTree) => {
  const { onSelectNode, selectKeys, defaultExpandedKeys } = props;
  const [expandedKeys, setExpandedKeys] = useState<any[]>(
    defaultExpandedKeys || []
  );

  const handleChangeExpanded = (node: any) => {
    if (node.nodeType === NodeType.folder) {
      if (expandedKeys.includes(node.key)) {
        setExpandedKeys(() => expandedKeys.filter((item) => item !== node.key));
      } else {
        setExpandedKeys(() => [node.key, ...expandedKeys]);
      }
      return;
    }
  };
  const handleOnSelect = (selectedKeys: any[], info: any) => {
    const { node } = info;
    handleChangeExpanded(node);
    onSelectNode?.(node);
  };

  const handleOnExpand = (expandedKeys: any[], info: any) => {
    const { node } = info;
    handleChangeExpanded(node);
  };

  return (
    <div className={TreeStyle.content}>
      <Tree
        showIcon
        blockNode
        selectedKeys={selectKeys ?? []}
        switcherIcon={<DownOutlined />}
        onSelect={handleOnSelect}
        onExpand={handleOnExpand}
        expandedKeys={expandedKeys}
        {...props}
      />
    </div>
  );
};
export default CustomTree;
