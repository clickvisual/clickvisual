import configsStyles from "@/pages/Configure/styles/index.less";
import { CloudServerOutlined, FileOutlined } from "@ant-design/icons";
import { useModel } from "@umijs/max";
import { Tooltip } from "antd";
import classNames from "classnames";
import { useIntl } from "umi";

const MenuBar = () => {
  const { activeMenu, doSelectedMenu } = useModel("configure");
  const i18n = useIntl();
  const MenuItems = [
    {
      icon: <FileOutlined />,
      key: "files",
      label: `${i18n.formatMessage({ id: "config.menuBar.files" })}`,
    },
    {
      icon: <CloudServerOutlined />,
      key: "publish",
      label: `${i18n.formatMessage({ id: "config.menuBar.publish" })}`,
    },
  ];
  return (
    <div>
      <ul>
        {MenuItems.map((item) => (
          <li
            key={item.key}
            className={classNames({
              [configsStyles.active]: activeMenu == item.key,
            })}
            onClick={() => doSelectedMenu(item.key)}
          >
            <Tooltip title={item.label} placement={"left"}>
              {item.icon}
            </Tooltip>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default MenuBar;
