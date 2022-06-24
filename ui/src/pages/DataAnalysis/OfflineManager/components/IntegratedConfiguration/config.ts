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
