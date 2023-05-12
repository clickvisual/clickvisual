import systemSettingStyles from "@/layouts/SystemSetting/styles/index.less";
import { Outlet } from "@umijs/max";
import { ConfigProvider } from "antd";

const SystemSetting = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#ee722f",
          /** Weak action. Such as `allowClear` or Alert close button */
          colorIcon: "#ee722f",
          /** Weak action hover color. Such as `allowClear` or Alert close button */
          colorIconHover: "#ee722f",
          colorLink: "#ee722f",
          colorLinkHover: "#ee722f",
          colorLinkActive: "#ee722f",
          colorHighlight: "#ee722f",
        },
      }}
    >
      <div className={systemSettingStyles.systemSettingMain}>
        <Outlet />
      </div>
    </ConfigProvider>
  );
};
export default SystemSetting;
