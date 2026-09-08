export interface OverviewCreateTypeItem {
  createType: number;
  label: string;
  count: number;
}

export interface OverviewTableItem {
  tableId: number;
  instanceId: number;
  instanceName: string;
  databaseName: string;
  tableName: string;
  createType: number;
  ctime: number;
}

export interface OverviewTableVolume extends OverviewTableItem {
  totalRows: number;
  totalBytes: number;
}

export interface OverviewIngestion {
  instanceCount: number;
  databaseCount: number;
  tableCount: number;
  newTablesLast7Days: number;
  createTypes: OverviewCreateTypeItem[];
  totalRows: number;
  totalBytes: number;
  volumeUnavailableInstances: string[];
  topTables: OverviewTableVolume[];
  recentTables: OverviewTableItem[];
}

export interface OverviewDailyItem {
  date: string;
  count: number;
}

/** Mirrors db.AlarmStatus*: 0 unknown, 1 close, 2 normal, 3 firing, 4 rule check. */
export type OverviewAlarmStatus = 0 | 1 | 2 | 3 | 4;

/** Mirrors alarm level: 0 alarm, 1 notice, 2 serious. */
export type OverviewAlarmLevel = 0 | 1 | 2;

export interface OverviewAlarmItem {
  id: number;
  name: string;
  status: OverviewAlarmStatus;
  level: OverviewAlarmLevel;
  utime: number;
}

export interface OverviewAlarm {
  total: number;
  normal: number;
  firing: number;
  closed: number;
  ruleCheck: number;
  levelAlarm: number;
  levelNotice: number;
  levelSerious: number;
  todayCount: number;
  last7DayCount: number;
  pushSuccess: number;
  pushFail: number;
  pushRepeat: number;
  dailyTrend: OverviewDailyItem[];
  recentFiring: OverviewAlarmItem[];
}

export type OverviewReportExecutionStatus = "running" | "success" | "failed" | "partial";

export interface OverviewReportExecution {
  id: number;
  reportId: number;
  reportName: string;
  status: OverviewReportExecutionStatus | string;
  trigger: string;
  startedAt: number;
  durationSeconds: number;
}

export interface OverviewReportItem {
  id: number;
  name: string;
  status: "enabled" | "disabled" | string;
  utime: number;
}

export interface OverviewReport {
  total: number;
  enabled: number;
  disabled: number;
  scheduleTotal: number;
  scheduleEnabled: number;
  todayExecutions: number;
  todaySuccess: number;
  todayFailed: number;
  todayPartial: number;
  running: number;
  recentExecutions: OverviewReportExecution[];
  recentReports: OverviewReportItem[];
}

export interface OverviewSummary {
  generatedAt: number;
  ingestion: OverviewIngestion;
  alarm: OverviewAlarm;
  report: OverviewReport;
}
