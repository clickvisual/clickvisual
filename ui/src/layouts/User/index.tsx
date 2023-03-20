import userStyles from "@/layouts/User/styles/index.less";
import UserCardHeader from "@/layouts/User/UserCardHeader";
import { ConfigProvider } from "antd";
import { Outlet, SelectLang } from "umi";

const LoginLayout = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#ee722f",
        },
      }}
    >
      <div className={userStyles.userMain}>
        <div className={userStyles.userCard}>
          <UserCardHeader />
          <div className={userStyles.divider} />
          <Outlet />
        </div>
        <SelectLang className={userStyles.lang} reload={false} />
      </div>
    </ConfigProvider>
  );
};

export default LoginLayout;
