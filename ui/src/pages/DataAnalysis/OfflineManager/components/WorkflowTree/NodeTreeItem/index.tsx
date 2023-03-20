import { Dropdown } from "antd";
import { ReactNode, useEffect } from "react";

export interface NodeTreeItemProps {
  children: ReactNode;
  menus: any[];
  onMenuClose?: () => void;
}

const NodeTreeItem = ({ onMenuClose, children, menus }: NodeTreeItemProps) => {
  useEffect(() => {
    return () => onMenuClose?.();
  }, []);

  return (
    <Dropdown menu={{ items: menus }} trigger={["contextMenu"]}>
      {children}
    </Dropdown>
  );
};
export default NodeTreeItem;
