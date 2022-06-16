import { Menu } from "antd";
import { OfflineRightMenuClickSourceEnums } from "@/pages/DataAnalysis/service/enums";
import { useMemo } from "react";
import { ItemType } from "antd/es/menu/hooks/useItems";
import { AppstoreAddOutlined, EditOutlined } from "@ant-design/icons";
import IconFont from "@/components/IconFont";

export interface RightMenuProps {
  clickSource: OfflineRightMenuClickSourceEnums;
}
const RightMenu = (props: RightMenuProps) => {
  const { clickSource } = props;

  const workflowMenu = [
    {
      label: "新建业务流程",
      key: "add-workflow",
      icon: <AppstoreAddOutlined />,
    },
    {
      label: "修改业务流程",
      key: "update-workflow",
      icon: <EditOutlined />,
    },
    {
      label: <span style={{ color: "rgb(222, 79, 79)" }}>删除业务流程</span>,
      key: "deleted-workflow",
      icon: <IconFont type={"icon-delete"} />,
    },
  ];

  const menuItems: ItemType[] = useMemo(() => {
    switch (clickSource) {
      case OfflineRightMenuClickSourceEnums.workflow:
        return workflowMenu;
      default:
        return [];
    }
  }, [clickSource]);

  return <Menu items={menuItems} />;
};
export default RightMenu;
