import { Dropdown } from "antd";
import { ReactElement, ReactNode, useEffect } from "react";

export interface NodeTreeItemProps {
  children: ReactNode;
  menus: ReactElement;
  onMenuClose?: () => void;
}

const NodeTreeItem = ({ onMenuClose, children, menus }: NodeTreeItemProps) => {
  useEffect(() => {
    return () => onMenuClose?.();
  }, []);

  return (
    <Dropdown overlay={menus} trigger={["contextMenu"]}>
      {children}
    </Dropdown>
  );
};
export default NodeTreeItem;
