export enum NoDataConfigs {
  NoData = 0,
  OK = 1,
  Alert = 2,
}

export const NoDataConfigList = [
  { value: NoDataConfigs.NoData, label: "No Data" },
  { value: NoDataConfigs.OK, label: "OK" },
  { value: NoDataConfigs.Alert, label: "Alert" },
];

export const typList = [
  { key: 0, label: "WHEN" },
  { key: 1, label: "AND" },
  { key: 2, label: "OR" },
];

export const expList = [
  { key: 3, label: "sum" },
  { key: 0, label: "avg" },
  { key: 1, label: "min" },
  { key: 2, label: "max" },
  // { key: 4, label: "count()" },
];

export const condList = [
  { key: 0, label: "above" },
  { key: 1, label: "below" },
  { key: 2, label: "outside range" },
  { key: 3, label: "within range" },
];
