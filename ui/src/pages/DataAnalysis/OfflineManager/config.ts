export enum DataSourceTypeEnums {
  ClickHouse = -1,
  MySQL = 1,
}

export enum FormItemEnums {
  type = "type",
  datasource = "datasource",
  database = "database",
}

export enum CustomCollapseEnums {
  dataSource = 1,
  fieldMapping = 2,
  schedulingConfig = 3,
}

export enum NodeRunningStatusEnums {
  /**
   * 无状态
   */
  noState = 0,
  /**
   * 等待定时任务
   */
  pending = 1,
  /**
   * 执行中
   */
  inProgress = 2,
  /**
   * 执行异常
   */
  ExecutionException = 3,
  /**
   * 执行完成
   */
  ExecuteComplete = 4,

  /**
   * 待执行
   */
  PendingRun = 5,
}

export const TypeOptions: any[] = [];
for (const type in DataSourceTypeEnums) {
  let typeToAny: any = type;
  if (!isNaN(typeToAny)) {
    TypeOptions.push({
      value: parseInt(type),
      label: DataSourceTypeEnums[type],
    });
  }
}
