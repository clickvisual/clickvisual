import userStyles from "@/layouts/User/styles/index.less";
import UserCardHeader from "@/layouts/User/UserCardHeader";
import React from "react";
import { useModel } from "@@/plugin-model/useModel";
import { Redirect, SelectLang } from "umi";
import { HOME_PATH } from "@/config/config";

type UserProps = {
  children: React.ReactNode;
};

const LoginLayout = ({ children }: UserProps) => {
  const { currentUser } = useModel("@@initialState").initialState || {};
  if (currentUser) {
    return <Redirect to={HOME_PATH} />;
  }

  return (
    <div className={userStyles.userMain}>
      <div className={userStyles.userCard}>
        <UserCardHeader />
        <div className={userStyles.divider} />
        {children}
      </div>
      <SelectLang className={userStyles.lang} reload={false} />
    </div>
  );
};

export default LoginLayout;
