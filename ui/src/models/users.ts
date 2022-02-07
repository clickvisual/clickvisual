import useRequest from "@/hooks/useRequest/useRequest";
import { LoginByPassword, LoginOut } from "@/services/users";
import { history } from "umi";
import { HOME_PATH, LOGIN_PATH } from "@/config/config";
import { message } from "antd";
import { formatMessage } from "@@/plugin-locale/localeExports";

const UserActions = () => {
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
  return {
    loginByPassword,
    loginOut,
  };
};
export default UserActions;
