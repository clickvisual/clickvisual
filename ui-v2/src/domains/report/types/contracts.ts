export type ReportTaskStatus = "enabled" | "paused";

export interface ReportListItem {
  id: number;
  nodeId: number;
  name: string;
  desc: string;
  status: ReportTaskStatus;
  dutyUid: number;
  updatedAt: string;
}

export interface ReportScheduleArg {
  key: string;
  val: string;
}

export interface ReportScheduleConfig {
  reportId: number;
  desc: string;
  dutyUid: number;
  cron: string;
  typ: number;
  args: ReportScheduleArg[];
  isRetry: number;
  retryTimes: number;
  retryInterval: number;
  channelIds: number[];
}

export type ReportQueryMode = "sql" | "dsl";
export type ReportOutputFormat = "markdown" | "image" | "excel";
export type ReportBuilderTimeRange = "1h" | "1d";

export interface ReportEditorDraft {
  reportId: number;
  nodeId: number;
  name: string;
  desc: string;
  queryMode: ReportQueryMode;
  queryText: string;
  templateKey: string;
  outputFormat: ReportOutputFormat;
  recipientChannelIds: number[];
  builder?: ReportBuilderInput | null;
}

export type PushChannelType = "dingtalk";

export interface PushChannelBase {
  id: number;
  key: string;
  name: string;
  typ: PushChannelType;
  enabled: boolean;
}

export interface DingTalkPushChannel extends PushChannelBase {
  typ: "dingtalk";
  token: string;
  webhook: string;
}

export type ReportPushChannel = DingTalkPushChannel;

export type ReportExecutionStatus = "success" | "failed" | "running" | "unknown";
export type ReportExecutionTrigger = "schedule" | "manual";

export interface ReportExecutionPreview {
  reportId: number;
  canRun: boolean;
  nextRunAt: string;
  lastRunAt?: string;
  message: string;
}

export interface ReportExecutionRecord {
  id: number;
  reportId: number;
  status: ReportExecutionStatus;
  trigger: ReportExecutionTrigger;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  operatorName: string;
  errorMessage?: string;
  channelResults: ReportChannelSendDetail[];
}

export interface ReportScheduleExecutionSummary {
  status: ReportExecutionStatus;
  trigger: ReportExecutionTrigger;
  startedAt: string;
  endedAt?: string;
  operatorName: string;
}

export interface ReportScheduleRuntime {
  registered: boolean;
  paused: boolean;
  nextRunAt: string;
  lastScheduledExecution?: ReportScheduleExecutionSummary;
}

export interface ReportChannelSendSummary {
  channelId: number;
  channelTyp: PushChannelType;
  success: number;
  failed: number;
  lastSentAt: string;
}

export interface ReportChannelSendDetail extends ReportChannelSendSummary {
  attempts?: number;
  retried?: number;
  retryTimes?: number;
  retryInterval?: number;
  errors?: string[];
}

export interface ReportSendResultSummary {
  reportId: number;
  total: number;
  success: number;
  failed: number;
  channels: ReportChannelSendSummary[];
}

export interface ReportWorkspace {
  activeReportId: number;
  list: ReportListItem[];
  editor: ReportEditorDraft;
  schedule: ReportScheduleConfig;
  preview: ReportExecutionPreview;
  executions: ReportExecutionRecord[];
  delivery: ReportSendResultSummary;
  channels: ReportPushChannel[];
  runtime: ReportScheduleRuntime;
}

export interface ReportMetricInput {
  key: string;
  label: string;
  expression?: string;
  groupBy?: string;
  limit?: number;
}

export interface ReportBlockInput {
  key: string;
  label: string;
  where: string;
  metrics: ReportMetricInput[];
}

export interface ReportBuilderInput {
  instanceId: number;
  database: string;
  table: string;
  timeField: string;
  timeRange: ReportBuilderTimeRange;
  where: string;
  metrics: ReportMetricInput[];
  blocks: ReportBlockInput[];
}

export interface ReportCreatePayload {
  reportId?: number;
  name: string;
  desc?: string;
  builder: ReportBuilderInput;
}

export interface ReportDefinition {
  reportId: number;
  name: string;
  desc: string;
  status: ReportTaskStatus;
  queryMode: ReportQueryMode;
  queryText: string;
  templateKey: string;
  outputFormat: ReportOutputFormat;
  dutyUid: number;
  creatorUid: number;
  updatedAt: string;
  builder?: ReportBuilderInput | null;
}

export interface ReportSourceTable {
  name: string;
}

export interface ReportSourceDatabase {
  name: string;
}

export interface ReportSourceInstance {
  id: number;
  name: string;
  desc: string;
}

export interface ReportSourceColumn {
  field: string;
  type: string;
  comment?: string;
}
