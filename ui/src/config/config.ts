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
// 截流时间
export const THROTTLE_WAIT = 1000;

// 登录路由
export const LOGIN_PATH = "/user/login";

// 安装流程路由
export const INSTALL_INIT = "/install/init";

// 日志查询路由
export const QUERY_PATH = process.env.PUBLIC_PATH + "query";

// 报警规则路由
export const ALARMRULES_PATH = process.env.PUBLIC_PATH + "alarm/rules";

// 日志拓扑路由
export const LOGTOPOLOGY_PATH = process.env.PUBLIC_PATH + "bigdata";

// 链路关系图路由 DAG FDG
export const GRAPHICS_PATH = process.env.PUBLIC_PATH + "graphics";

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

// 不展开日志最大长度
export const LOGMAXTEXTLENGTH = 500;

// 链路日志查询条数
export const LINKLOGS_PAGESIZE = 100;
