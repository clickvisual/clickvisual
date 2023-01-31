import useRequest from "@/hooks/useRequest/useRequest";
import sysUserApi from "@/services/systemUser";

const User = () => {
  const doGetUserList = useRequest(sysUserApi.getUserList, {
    loadingText: false,
  });

  const doCreateUser = useRequest(sysUserApi.createUser, {
    loadingText: false,
  });

  const doDeleteUser = useRequest(sysUserApi.deleteUser, {
    loadingText: false,
  });

  const doResetUserPassword = useRequest(sysUserApi.resetUserPassword, {
    loadingText: false,
  });

  const doEditUserInfo = useRequest(sysUserApi.editUserInfo, {
    loadingText: false,
  });

  return {
    doGetUserList,
    doCreateUser,
    doDeleteUser,
    doResetUserPassword,
    doEditUserInfo,
  };
};
export default User;
