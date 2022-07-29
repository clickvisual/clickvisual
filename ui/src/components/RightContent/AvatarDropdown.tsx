import {
  FileTextOutlined,
  LogoutOutlined,
  UpCircleOutlined,
} from "@ant-design/icons";
import { Avatar, Menu, Spin } from "antd";
import HeaderDropdown from "../HeaderDropdown";
import styles from "./index.less";
import { useModel } from "@@/plugin-model/useModel";
import { useIntl } from "umi";
import IconFont from "@/components/IconFont";
import ChangePasswordModal from "@/components/RightContent/ChangePasswordModal";
import { useMemo } from "react";

const AvatarDropdown = () => {
  const { currentUser } = useModel("@@initialState").initialState || {};
  const { loginOut, actionPassword, doDatalogUpgrade } = useModel("users");
  const i18n = useIntl();

  const handleLogout = () => {
    loginOut.run();
  };

  const handleUpgrade = () => {
    doDatalogUpgrade();
  };

  const handleResetPassword = () => {
    actionPassword.onChangeVisibleChangePassword(true);
  };

  // 隐藏修改密码按钮
  const hiddenPassword = useMemo(() => {
    // 通过登录态登录时隐藏修改密码按钮
    if (currentUser?.access === "auth.proxy.cookie") return false;

    // 通过三方登录时隐藏修改密码按钮，oauth，oauthId 第三方登录平台记录
    if (currentUser?.oauth === "" && currentUser?.oauthId === "") return true;

    return false;
  }, [currentUser]);

  // 隐藏退出登录按钮
  const hiddenLogOut = useMemo(
    () => currentUser?.access !== "auth.proxy.cookie",
    [currentUser]
  );

  const menuHeaderDropdown = (
    <Menu className={styles.menu} selectedKeys={[]}>
      {hiddenPassword && (
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
        icon={<UpCircleOutlined />}
        key="upgrade"
        onClick={() => handleUpgrade()}
      >
        {i18n.formatMessage({
          id: "navbar.upgrade",
        })}
      </Menu.Item>
      <Menu.Item icon={<FileTextOutlined />} key="interfaceDoc">
        <a href="/api/v2/swagger/index.html" target="_blank">
          {i18n.formatMessage({
            id: "navbar.interfaceDoc",
          })}
        </a>
      </Menu.Item>
      {hiddenLogOut && (
        <Menu.Item
          icon={<LogoutOutlined />}
          key="logout"
          onClick={() => handleLogout()}
        >
          {i18n.formatMessage({
            id: "navbar.logOut",
          })}
        </Menu.Item>
      )}
      <ChangePasswordModal />
    </Menu>
  );
  if (currentUser && currentUser.id === 0) return <></>;

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
