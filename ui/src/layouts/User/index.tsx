import userStyles from "@/layouts/User/styles/index.less";
import UserCardHeader from "@/layouts/User/UserCardHeader";
import React from "react";
import { SelectLang } from "umi";

type UserProps = {
  children: React.ReactNode;
};

const LoginLayout = ({ children }: UserProps) => {
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
