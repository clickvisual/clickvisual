import useRequest from "@/hooks/useRequest/useRequest";
import {
  LoginByPassword,
  LoginOut,
  updatedDatabaseStructure,
} from "@/services/users";
import { history } from "umi";
import { HOME_PATH, LOGIN_PATH } from "@/config/config";
import { message } from "antd";
import { formatMessage } from "@@/plugin-locale/localeExports";
import usePassword from "@/models/users/usePassword";

const UserActions = () => {
  const actionPassword = usePassword();

  const loginByPassword = useRequest(LoginByPassword, {
    loadingText: false,
    onSuccess: () => {
      message.success(formatMessage({ id: "login.message.success" }));
      document.location = HOME_PATH;
    },
  });

  const loginOut = useRequest(LoginOut, {
    loadingText: false,
    onSuccess: () => {
      message.success(formatMessage({ id: "login.message.logOut" }));
      history.push(LOGIN_PATH);
    },
  });
  const doDatalogUpgrade = () => {
    message.loading(formatMessage({ id: "navbar.upgrade.lodingText" }), 0);
    datalogUpgrade.run();
  };

  const datalogUpgrade = useRequest(updatedDatabaseStructure, {
    loadingText: false,
    onSuccess: () => {
      message.destroy();
      message.success(formatMessage({ id: "navbar.upgrade.successText" }));
    },
    onError: () => {
      message.destroy();
    },
  });
  return {
    actionPassword,
    loginByPassword,
    loginOut,
    doDatalogUpgrade,
  };
};
export default UserActions;
