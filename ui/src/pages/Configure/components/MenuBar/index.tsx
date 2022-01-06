import configsStyles from "@/pages/Configure/styles/index.less";
import { FileOutlined, CloudServerOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { useModel } from "@@/plugin-model/useModel";

type MenuBarProps = {};
const MenuItems = [
  {
    icon: <FileOutlined />,
    key: "files",
    label: "配置编辑",
  },
  {
    icon: <CloudServerOutlined />,
    key: "publish",
    label: "版本发布",
  },
];
const MenuBar = (props: MenuBarProps) => {
  const { activeMenu, doSelectedMenu } = useModel("configure");
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
            {item.icon}
          </li>
        ))}
      </ul>
    </div>
  );
};
export default MenuBar;
