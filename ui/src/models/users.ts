import useRequest from "@/hooks/useRequest/useRequest";
import { LoginByPassword, LoginOut } from "@/services/users";
import { history } from "umi";
import { HOME_PATH, LOGIN_PATH } from "@/config/config";

const UserActions = () => {
  const loginByPassword = useRequest(LoginByPassword, {
    loadingText: { done: "登录成功" },
    onSuccess: () => {
      document.location = HOME_PATH;
    },
  });

  const loginOut = useRequest(LoginOut, {
    loadingText: { done: "退出登录成功" },
    onSuccess: () => history.push(LOGIN_PATH),
  });
  return {
    loginByPassword,
    loginOut,
  };
};
export default UserActions;
