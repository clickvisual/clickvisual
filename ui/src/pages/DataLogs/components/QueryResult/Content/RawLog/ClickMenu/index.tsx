// import style from "@/pages/DataLogs/components/QueryResult/Content/RawLog/ClickMenu/index.less";
import { Menu, Dropdown, message } from "antd";
import { ReactNode } from "react";
import copy from "copy-to-clipboard";
import { useIntl } from "umi";
interface ClickMenuProps {
  children: ReactNode;
  content: string;
  field: string;
}
const ClickMenu = (props: ClickMenuProps) => {
  const i18n = useIntl();
  const { content, children, field } = props;
  const handleCopyLog = () => {
    message.success(i18n.formatMessage({ id: "log.item.copy.success" }));
    copy(content);
  };
  const menu = (
    <Menu>
      <Menu.Item key="addQuery">添加查询条件</Menu.Item>
      <Menu.Item key="reduceQuery">排除查询条件</Menu.Item>
      <Menu.Divider />
      <Menu.Item key="copyValue">
        <div onClick={handleCopyLog}>复制值</div>
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
