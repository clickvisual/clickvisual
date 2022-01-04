import userStyles from '@/layouts/User/styles/index.less';
import UserCardHeader from '@/layouts/User/UserCardHeader';
import React from 'react';

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
    </div>
  );
};

export default LoginLayout;
