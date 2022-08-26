// import style from "@/pages/DataLogs/components/QueryResult/Content/RawLog/ClickMenu/index.less";
import {Dropdown, Menu, message} from "antd";
import {ReactNode} from "react";
import copy from "copy-to-clipboard";
import {useIntl} from "umi";

interface ClickMenuProps {
  children: ReactNode;
  content: string | number | bigint;
  field: string | undefined;
  handleAddCondition: () => void;
  handleOutCondition: () => void;
  isHidden?: boolean;
}
const ClickMenu = (props: ClickMenuProps) => {
  const i18n = useIntl();
  const {
    content,
    children,
    handleAddCondition,
    handleOutCondition,
    isHidden,
  } = props;

  const handleCopyLog = () => {
    copy(content.toString());
    message.success(i18n.formatMessage({ id: "log.item.copy.success" }));
  };

  const menu = (
    <Menu style={{ width: "190px" }}>
      {!isHidden && (
        <>
          <Menu.Item key="addQuery" onClick={handleAddCondition}>
            {i18n.formatMessage({ id: "log.ClickMenu.addCondition" })}
          </Menu.Item>
          <Menu.Item key="reduceQuery" onClick={handleOutCondition}>
            {i18n.formatMessage({ id: "log.ClickMenu.excludeCondition" })}
          </Menu.Item>
          <Menu.Divider />
        </>
      )}
      <Menu.Item key="copyValue">
        <div onClick={handleCopyLog}>
          {i18n.formatMessage({ id: "log.ClickMenu.copyValues" })}
        </div>
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown overlay={menu} placement="bottomLeft" trigger={["click"]}>
      {children}
    </Dropdown>
  );
};

export default ClickMenu;
