import {
  buildReportWorkspaceMock,
  reportEditorDraftMockById,
  reportChannelsMock,
  reportExecutionPreviewMockById,
  reportListMock,
  reportRecentExecutionsMockById,
  reportScheduleRuntimeMockById,
  reportScheduleMockById,
  reportSendSummaryMockById
} from "../mocks/reportMockData";
import { client } from "../../../shared/http/client";
import type {
  ReportBlockInput,
  ReportBuilderTimeRange,
  ReportCreatePayload,
  ReportDefinition,
  ReportEditorDraft,
  ReportExecutionPreview,
  ReportExecutionRecord,
  ReportListItem,
  ReportPushChannel,
  ReportScheduleConfig,
  ReportSourceColumn,
  ReportSourceDatabase,
  ReportSourceInstance,
  ReportSourceTable,
  ReportSendResultSummary,
  ReportWorkspace
} from "../types/contracts";

interface ReportScheduleResponse {
  nodeId: number;
  desc: string;
  dutyUid: number;
  cron: string;
  typ: number;
  channelIds: number[];
  isRetry: number;
  retryTimes: number;
  retryInterval: number;
}

interface ReportPreviewRunResponse {
  preview: ReportExecutionPreview;
  execution: ReportExecutionRecord;
  delivery: ReportSendResultSummary;
}

interface ReportDeleteResponse {
  reportId: number;
}

type ReportScheduleApiPayload = ReportScheduleResponse & {
  reportId?: number;
  args?: ReportScheduleConfig["args"];
  channelIds?: number[] | null;
};

type ReportWorkspaceApiPayload = Omit<ReportWorkspace, "schedule"> & {
  schedule: ReportScheduleApiPayload;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function findByReportId<T>(source: Record<number, T>, reportId: number): T {
  const data = source[reportId];
  if (!data) {
    throw new Error(`report mock not found: ${reportId}`);
  }
  return data;
}

function normalizeScheduleConfig(
  schedule: ReportScheduleApiPayload
): ReportScheduleConfig {
  return {
    reportId: schedule.reportId ?? schedule.nodeId,
    desc: schedule.desc,
    dutyUid: schedule.dutyUid,
    cron: schedule.cron,
    typ: schedule.typ,
    args: schedule.args ?? [],
    isRetry: schedule.isRetry,
    retryTimes: schedule.retryTimes,
    retryInterval: schedule.retryInterval,
    channelIds: schedule.channelIds ?? []
  };
}

function normalizeWorkspace(workspace: ReportWorkspaceApiPayload): ReportWorkspace {
  return {
    ...workspace,
    editor: {
      ...workspace.editor,
      builder: normalizeReportBuilder(workspace.editor.builder)
    },
    schedule: normalizeScheduleConfig(workspace.schedule),
    acceleration: workspace.acceleration ?? {
      status: "missing",
      targetTable: "",
      mvName: "",
      errorMessage: ""
    }
  };
}

function normalizeList<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeReportBlocks(builder: ReportCreatePayload["builder"] | ReportDefinition["builder"] | ReportEditorDraft["builder"]) {
  if (!builder) {
    return [];
  }
  if (Array.isArray(builder.blocks) && builder.blocks.length > 0) {
    return builder.blocks.map((block, index) => ({
      key: block.key || `block_${index + 1}`,
      label: block.label || `条件块 ${index + 1}`,
      where: block.where || "",
      metrics:
        Array.isArray(block.metrics) && block.metrics.length > 0
          ? block.metrics.map((metric) => ({
              ...metric,
              groupBy: metric.groupBy || "",
              limit: typeof metric.limit === "number" ? metric.limit : 3
            }))
          : [{ key: "count", label: "总量", groupBy: "", limit: 3 }]
    }));
  }
  return [
    {
      key: "default",
      label: "默认条件块",
      where: builder.where || "",
      metrics:
        Array.isArray(builder.metrics) && builder.metrics.length > 0
          ? builder.metrics.map((metric) => ({
              ...metric,
              groupBy: metric.groupBy || "",
              limit: typeof metric.limit === "number" ? metric.limit : 3
            }))
          : [{ key: "count", label: "总量", groupBy: "", limit: 3 }]
    }
  ];
}

function normalizeReportBuilder(
  builder: ReportCreatePayload["builder"] | ReportDefinition["builder"] | ReportEditorDraft["builder"]
) {
  if (!builder) {
    return null;
  }
  const blocks = normalizeReportBlocks(builder);
  return {
    ...builder,
    cluster: builder.cluster || "",
    where: builder.where || "",
    metrics: Array.isArray(builder.metrics) ? builder.metrics : [],
    blocks
  };
}

export async function listReportItems(): Promise<ReportListItem[]> {
  try {
    return await client.get<ReportListItem[]>("/api/v2/reports/list");
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return clone(reportListMock);
    }
    throw error;
  }
}

function previewQueryText(payload: ReportCreatePayload) {
  const builder = normalizeReportBuilder(payload.builder)!;
  const { database, table, timeField, timeRange, blocks } = builder;
  const metrics = blocks.flatMap((block) => block.metrics.map((metric) => `${block.label}:${metric.label}`));
  const whereClause = blocks
    .map((block) => block.where.trim())
    .filter(Boolean)
    .map((item) => `(${item})`)
    .join(" OR ");
  if (timeRange === "1d") {
    return [
      "WITH toStartOfDay(now()) AS current_end,",
      "current_end - INTERVAL 1 DAY AS current_start,",
      "current_start - INTERVAL 1 DAY AS previous_start,",
      "current_start AS previous_end",
      `SELECT * FROM \`${database}\`.\`${table}\``,
      `WHERE ${timeField} >= current_start AND ${timeField} < current_end${whereClause ? ` AND (${whereClause})` : ""}`,
      `-- metrics: ${metrics.join(", ")}`
    ].join(" ");
  }
  return [
    "WITH now() AS current_end,",
    "current_end - INTERVAL 1 HOUR AS current_start,",
    "current_end - INTERVAL 1 DAY AS previous_end,",
    "previous_end - INTERVAL 1 HOUR AS previous_start",
    `SELECT * FROM \`${database}\`.\`${table}\``,
    `WHERE ${timeField} >= current_start AND ${timeField} < current_end${whereClause ? ` AND (${whereClause})` : ""}`,
    `-- metrics: ${metrics.join(", ")}`
  ].join(" ");
}

function reportTimeRangeLabel(timeRange: ReportCreatePayload["builder"]["timeRange"]) {
  if (timeRange === "1d") {
    return "昨天";
  }
  if (timeRange === "1h") {
    return "最近1h";
  }
  return `最近${timeRange}`;
}

export async function listReportSourceInstances(): Promise<ReportSourceInstance[]> {
  try {
    const raw = await client.get<ReportSourceInstance[] | null>(
      "/api/v2/reports/instances"
    );
    return normalizeList(raw);
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return [
        {
          id: 1,
          name: "生产 ClickHouse",
          desc: "本地测试实例",
          clusters: []
        }
      ];
    }
    throw error;
  }
}

export async function listReportSourceDatabases(
  instanceId: number
): Promise<ReportSourceDatabase[]> {
  try {
    const raw = await client.get<ReportSourceDatabase[] | null>(
      `/api/v2/reports/instances/${instanceId}/databases`
    );
    return normalizeList(raw);
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return [{ name: "default" }];
    }
    throw error;
  }
}

export async function listReportSourceTables(
  instanceId: number,
  database: string
): Promise<ReportSourceTable[]> {
  try {
    const raw = await client.get<ReportSourceTable[] | null>(
      `/api/v2/reports/instances/${instanceId}/databases/${database}/tables`
    );
    return normalizeList(raw);
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return [{ name: "logs" }];
    }
    throw error;
  }
}

export async function listReportTableColumns(
  instanceId: number,
  database: string,
  table: string
): Promise<ReportSourceColumn[]> {
  try {
    const raw = await client.get<ReportSourceColumn[] | null>(
      `/api/v2/reports/instances/${instanceId}/databases/${database}/tables/${table}/columns`
    );
    return normalizeList(raw);
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return [
        { field: "event_time", type: "DateTime" },
        { field: "level", type: "String" },
        { field: "trace_id", type: "String" }
      ];
    }
    throw error;
  }
}

export async function createReport(
  payload: ReportCreatePayload
): Promise<ReportDefinition> {
  try {
    return await client.post<ReportDefinition>("/api/v2/reports", payload);
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      const nextID =
        payload.reportId ??
        (reportListMock.reduce((max, item) => Math.max(max, item.id), 1000) + 1);
      const updatedAt = "2026-03-31T18:00:00+08:00";
      const created = {
        reportId: nextID,
        name: payload.name,
        desc:
          payload.desc ||
          `${payload.builder.database}.${payload.builder.table} ${reportTimeRangeLabel(payload.builder.timeRange)}，昨天同期环比`,
        status: "enabled" as const,
        queryMode: "sql" as const,
        queryText: previewQueryText(payload),
        templateKey: "report-builder-default",
        outputFormat: "markdown" as const,
        dutyUid: 0,
        creatorUid: 0,
        updatedAt,
        builder: normalizeReportBuilder(clone(payload.builder))
      };

      const listItem = {
        id: nextID,
        nodeId: nextID,
        name: payload.name,
        desc: created.desc,
        status: "enabled" as const,
        dutyUid: 0,
        updatedAt
      };
      const existingIndex = reportListMock.findIndex((item) => item.id === nextID);
      if (existingIndex >= 0) {
        reportListMock[existingIndex] = listItem;
      } else {
        reportListMock.push(listItem);
      }
      reportEditorDraftMockById[nextID] = {
        reportId: nextID,
        nodeId: nextID,
        name: payload.name,
        desc: created.desc,
        queryMode: "sql",
        queryText: created.queryText,
        templateKey: "report-builder-default",
        outputFormat: "markdown",
        recipientChannelIds: [],
        builder: normalizeReportBuilder(clone(payload.builder))
      };
      reportScheduleMockById[nextID] = {
        reportId: nextID,
        desc: "",
        dutyUid: 0,
        cron: "",
        typ: 0,
        args: [],
        isRetry: 0,
        retryTimes: 0,
        retryInterval: 0,
        channelIds: []
      };
      reportExecutionPreviewMockById[nextID] = {
        reportId: nextID,
        canRun: false,
        nextRunAt: "",
        lastRunAt: "",
        message: ""
      };
      reportRecentExecutionsMockById[nextID] = [];
      reportSendSummaryMockById[nextID] = {
        reportId: nextID,
        total: 0,
        success: 0,
        failed: 0,
        channels: []
      };
      reportScheduleRuntimeMockById[nextID] = {
        registered: false,
        paused: false,
        nextRunAt: ""
      };
      return created;
    }
    throw error;
  }
}

export async function deleteReport(reportId: number): Promise<void> {
  try {
    await client.delete<ReportDeleteResponse>(`/api/v2/reports/${reportId}`);
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      const nextIndex = reportListMock.findIndex((item) => item.id === reportId);
      if (nextIndex < 0) {
        throw new Error(`report mock not found: ${reportId}`);
      }
      reportListMock.splice(nextIndex, 1);
      delete reportEditorDraftMockById[reportId];
      delete reportScheduleMockById[reportId];
      delete reportExecutionPreviewMockById[reportId];
      delete reportRecentExecutionsMockById[reportId];
      delete reportSendSummaryMockById[reportId];
      delete reportScheduleRuntimeMockById[reportId];
      return;
    }
    throw error;
  }
}

export async function getReportScheduleConfig(
  reportId: number
): Promise<ReportScheduleConfig> {
  try {
    const raw = await client.get<ReportScheduleApiPayload>(
      `/api/v2/reports/configs/${reportId}`
    );
    return normalizeScheduleConfig(raw);
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return clone(findByReportId(reportScheduleMockById, reportId));
    }
    throw error;
  }
}

export async function saveReportSchedule(
  payload: ReportScheduleConfig
): Promise<ReportScheduleConfig> {
  const saved = await client.post<ReportScheduleResponse>(
    "/api/v2/reports/configs",
    {
      nodeId: payload.reportId,
      desc: payload.desc,
      dutyUid: payload.dutyUid,
      cron: payload.cron,
      typ: payload.typ,
      channelIds: payload.channelIds,
      isRetry: payload.isRetry,
      retryTimes: payload.retryTimes,
      retryInterval: payload.retryInterval
    }
  );

  reportScheduleMockById[payload.reportId] = {
    ...normalizeScheduleConfig({
      ...saved,
      reportId: payload.reportId,
      args: payload.args
    }),
    args: clone(payload.args)
  };
  const editor = reportEditorDraftMockById[payload.reportId];
  if (editor) {
    editor.recipientChannelIds = clone(saved.channelIds);
  }
  return clone(reportScheduleMockById[payload.reportId]);
}

export async function getReportEditorDraft(
  reportId: number
): Promise<ReportEditorDraft> {
  try {
    const raw = await client.get<ReportEditorDraft>(
      `/api/v2/reports/editor?reportId=${reportId}`
    );
    return {
      ...raw,
      builder: normalizeReportBuilder(raw.builder)
    };
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      const draft = clone(findByReportId(reportEditorDraftMockById, reportId));
      return {
        ...draft,
        builder: normalizeReportBuilder(draft.builder)
      };
    }
    throw error;
  }
}

export async function listReportChannels(): Promise<ReportPushChannel[]> {
  try {
    return await client.get<ReportPushChannel[]>("/api/v2/reports/channels");
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return clone(reportChannelsMock);
    }
    throw error;
  }
}

export async function getReportChannels(): Promise<ReportPushChannel[]> {
  return listReportChannels();
}

export async function getReportExecutionPreview(
  reportId: number
): Promise<ReportExecutionPreview> {
  try {
    return await client.get<ReportExecutionPreview>(
      `/api/v2/reports/preview?reportId=${reportId}`
    );
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return clone(findByReportId(reportExecutionPreviewMockById, reportId));
    }
    throw error;
  }
}

export async function listReportRecentExecutions(
  reportId: number
): Promise<ReportExecutionRecord[]> {
  try {
    return await client.get<ReportExecutionRecord[]>(
      `/api/v2/reports/executions?reportId=${reportId}`
    );
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return clone(findByReportId(reportRecentExecutionsMockById, reportId));
    }
    throw error;
  }
}

export async function getReportSendSummary(
  reportId: number
): Promise<ReportSendResultSummary> {
  try {
    return await client.get<ReportSendResultSummary>(
      `/api/v2/reports/delivery?reportId=${reportId}`
    );
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return clone(findByReportId(reportSendSummaryMockById, reportId));
    }
    throw error;
  }
}

export async function getReportWorkspace(reportId?: number): Promise<ReportWorkspace> {
  const query = reportId ? `?reportId=${reportId}` : "";

  try {
    const raw = await client.get<ReportWorkspaceApiPayload>(
      `/api/v2/reports/workspace${query}`
    );
    return normalizeWorkspace(raw);
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return buildReportWorkspaceMock(reportId);
    }
    throw error;
  }
}

export async function runReportPreview(
  reportId: number
): Promise<ReportPreviewRunResponse> {
  return client.post<ReportPreviewRunResponse>("/api/v2/reports/preview-run", {
    reportId
  });
}
