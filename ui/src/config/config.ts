// 通用常量

// 分页参数：currentPage
export const FIRST_PAGE = 1;
// 分页参数：pageSize
export const PAGE_SIZE = 10;

// 时间组件：activeKey
export enum TimeRangeType {
  Relative = "relative",
  Custom = "custom",
}

export enum QueryTypeEnum {
  LOG = "rawLog",
  TABLE = "statisticalTable",
}

// 时间组件：activeIndex
export const ACTIVE_TIME_INDEX = 2;
// 时间组件：activeIndex
export const ACTIVE_TIME_NOT_INDEX = -1;

// 时间组件: 15分钟 刻度
export const FIFTEEN_TIME = 15;
// 时间组件：15分钟 单位
export const MINUTES_UNIT_TIME = "minutes";

// 防抖时间
export const DEBOUNCE_WAIT = 500;

// 登录路由
export const LOGIN_PATH = "/user/login";

// 分享路由
export const SHARE_PATH = process.env.PUBLIC_PATH + "/share";

// 安装流程路由
export const INSTALL_INIT = "/install/init";

// 免登录路由
export const AVOID_CLOSE_ROUTING = [
  "/user/login",
  "/user/login/",
  "/install/init",
  "/install/init/",
];

// 首页路由
export const HOME_PATH = process.env.PUBLIC_PATH || "/";

// 语言：中文
export const LANG_CN = "zh-CN";
