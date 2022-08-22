import { createFromIconfontCN } from "@ant-design/icons";
const IconFont = createFromIconfontCN({
  scriptUrl: process.env.PUBLIC_PATH + "iconfont.js",
});

// 更新public下的iconfont.js文件

export default IconFont;
