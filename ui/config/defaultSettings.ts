import { Settings as LayoutSettings } from "@ant-design/pro-layout";

const Settings: LayoutSettings & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: "light",
  primaryColor: "#1890ff",
  layout: "top",
  contentWidth: "Fixed",
  fixedHeader: true,
  fixSiderbar: true,
  splitMenus: false,
  colorWeak: false,
  title: "ClickVisual",
  pwa: false,
  iconfontUrl: "",
};

export default Settings;
