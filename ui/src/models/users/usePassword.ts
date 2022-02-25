import { useState } from "react";
import useRequest from "@/hooks/useRequest/useRequest";
import { ChangePassword } from "@/services/users";

const usePassword = () => {
  const [visibleChangePassword, setVisibleChangePassword] =
    useState<boolean>(false);

  const onChangeVisibleChangePassword = (visible: boolean) => {
    setVisibleChangePassword(visible);
  };

  const doChangePassword = useRequest(ChangePassword, { loadingText: false });

  return {
    visibleChangePassword,
    doChangePassword,
    onChangeVisibleChangePassword,
  };
};
export default usePassword;
