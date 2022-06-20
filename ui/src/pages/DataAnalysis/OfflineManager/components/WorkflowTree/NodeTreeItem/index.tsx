import { Dropdown } from "antd";
import { ReactNode, useEffect } from "react";
import RightMenu from "@/pages/DataAnalysis/OfflineManager/components/WorkflowTree/RightMenu";
import { OfflineRightMenuClickSourceEnums } from "@/pages/DataAnalysis/service/enums";

export interface NodeTreeItemProps {
  source: OfflineRightMenuClickSourceEnums;
  currentNode?: any;
  children: ReactNode;
  onMenuClose?: () => void;
  handleCloseNodeModal?: () => void;
}

const NodeTreeItem = ({
  source,
  currentNode,
  onMenuClose,
  children,
  handleCloseNodeModal,
}: NodeTreeItemProps) => {
  useEffect(() => {
    return () => onMenuClose?.();
  }, []);

  return (
    <Dropdown
      overlay={
        <RightMenu
          handleCloseNodeModal={handleCloseNodeModal}
          clickSource={source}
          currentNode={currentNode}
        />
      }
      trigger={["contextMenu"]}
    >
      {children}
    </Dropdown>
  );
};
export default NodeTreeItem;
