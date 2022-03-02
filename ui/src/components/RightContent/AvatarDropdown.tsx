import { LogoutOutlined } from "@ant-design/icons";
import { Avatar, Menu, Spin } from "antd";
import HeaderDropdown from "../HeaderDropdown";
import styles from "./index.less";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import IconFont from "@/components/IconFont";
import ChangePasswordModal from "@/components/RightContent/ChangePasswordModal";

const AvatarDropdown = () => {
  const { currentUser } = useModel("@@initialState").initialState || {};
  const { loginOut, actionPassword } = useModel("users");
  const i18n = useIntl();

  const handleLogout = () => {
    loginOut.run();
  };

  const handleResetPassword = () => {
    actionPassword.onChangeVisibleChangePassword(true);
  };

  const menuHeaderDropdown = (
    <Menu className={styles.menu} selectedKeys={[]}>
      {currentUser?.oauth === "" && currentUser?.oauthId === "" && (
        <Menu.Item
          icon={<IconFont type={"icon-reset-password"} />}
          key="resetPassword"
          onClick={() => handleResetPassword()}
        >
          {i18n.formatMessage({
            id: "navbar.changePassword",
          })}
        </Menu.Item>
      )}
      <Menu.Item
        icon={<LogoutOutlined />}
        key="logout"
        onClick={() => handleLogout()}
      >
        {i18n.formatMessage({
          id: "navbar.logOut",
        })}
      </Menu.Item>
      <ChangePasswordModal />
    </Menu>
  );
  return currentUser && currentUser.nickname ? (
    <HeaderDropdown overlay={menuHeaderDropdown}>
      <span className={`${styles.action} ${styles.account}`}>
        <Avatar
          size="small"
          className={styles.avatar}
          src={currentUser?.avatar || undefined}
          alt={currentUser?.nickname}
        >
          {currentUser?.nickname}
        </Avatar>
        <span className={`${styles.name} anticon`}>{currentUser.nickname}</span>
      </span>
    </HeaderDropdown>
  ) : (
    <span className={`${styles.action} ${styles.account}`}>
      <Spin
        size="small"
        style={{
          marginLeft: 8,
          marginRight: 8,
        }}
      />
    </span>
  );
};

export default AvatarDropdown;
