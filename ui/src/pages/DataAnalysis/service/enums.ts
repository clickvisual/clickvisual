export enum BusinessEngineEnum {
  Kafka = "Kafka",
  MergeTree = "MergeTree",
  Distributed = "Distributed",
}

export enum BigDataNavEnum {
  /**
   * 实时业务
   */
  RealTimeTrafficFlow = "realtime",
  /**
   * 临时查询
   */
  TemporaryQuery = "short",
  /**
   * 离线查询
   */
  OfflineManage = "offline",
  /**
   * 数据源管理
   */
  DataSourceManage = "datasourceManage",
}

export enum FolderEnums {
  /**
   * 节点 可在右侧打开
   */
  node = 1,

  /**
   * 文件夹 不可在右侧打开
   */
  folder = 2,
}

export enum PrimaryEnums {
  /**
   * 数据开发
   */
  mining = 1,

  /**
   * 临时查询
   */
  short = 3,
}

export enum SecondaryEnums {
  /**
   * 任意
   */
  all = 0,
  /**
   * 数据库
   */
  database = 1,
  /**
   * 数据集成
   */
  dataIntegration = 2,
  /**
   * 数据开发
   */
  dataMining = 3,
  /**
   * 看板
   */
  board = 4,

  /**
   * 通用节点
   */
  universal = 5,
}

export enum TertiaryEnums {
  /**
   * clickhouse
   */
  clickhouse = 10,
  /**
   * mysql
   */
  mysql = 11,
  /**
   * 离线分析
   */
  offline = 20,
  /**
   * 实时分析
   */
  realtime = 21,
  /**
   * 通用节点 - input
   */
  input = 22,
  /**
   * 通用节点 - output
   */
  output = 23,
}

export enum OfflineRightMenuClickSourceEnums {
  /**
   * 业务流程 Header
   */
  workflowHeader = "workflowHeader",
  /**
   * 业务流程 Item
   */
  workflowItem = "workflowItem",
  /**
   * 数据集成
   */
  dataIntegration = "dataIntegration",
  /**
   * 数据开发
   */
  dataDevelopment = "dataDevelopment",
  /**
   * 节点
   */
  node = "node",
  /**
   * 文件夹
   */
  folder = "folder",
}

export enum DataSourceReqTypEnums {
  /**
   * mysql
   */
  mysql = 1,
}

export enum FlowNodeTypeEnums {
  default = "default",
  input = "input",
  output = "output",
  group = "group",
}
