import { DownOutlined } from "@ant-design/icons";
import { Tree } from "antd";
import { useEffect, useState } from "react";
import styles from "./index.less";

const LinkTree = (props: { log: any }) => {
  const { log } = props;
  const [expandedKeys, setExpandedKeys] = useState<any[]>([]);

  // const handleOnExpand = (e: any) => {
  //   console.log(e, "e2");
  // };

  // const handleOnSelect = (e: any) => {
  //   console.log(e, "e1");
  // };

  useEffect(() => {
    log && setExpandedKeys(handleAutoExpand([log], []));
  }, [log]);

  // 自动展开
  const handleAutoExpand = (list: any[], keyList: any[]) => {
    list.map((item: any) => {
      if (item.children.length > 0) {
        keyList.push(item.key);
        handleAutoExpand(item.children, keyList);
      }
    });
    return keyList;
  };

  return (
    <div className={styles.tree}>
      <Tree
        showIcon
        blockNode
        // showLine
        multiple
        autoExpandParent
        switcherIcon={<DownOutlined />}
        // onSelect={handleOnSelect}
        // selectedKeys={selectKeys ?? []}
        // onExpand={handleOnExpand}
        expandedKeys={expandedKeys}
        treeData={[log]}
      />
    </div>
  );
};
export default LinkTree;
