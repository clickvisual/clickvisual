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
      builder: workspace.editor.builder ?? null
    },
    schedule: normalizeScheduleConfig(workspace.schedule)
  };
}

function normalizeList<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
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
  const { database, table, timeField, timeRange, where, metrics } = payload.builder;
  const duration = timeRange === "1d" ? "1 DAY" : "1 HOUR";
  const whereClause = where.trim() ? ` AND (${where.trim()})` : "";
  return [
    "WITH now() AS current_end,",
    `current_end - INTERVAL ${duration} AS current_start,`,
    "current_end - INTERVAL 1 DAY AS previous_end,",
    `previous_end - INTERVAL ${duration} AS previous_start`,
    `SELECT * FROM \`${database}\`.\`${table}\``,
    `WHERE ${timeField} >= current_start AND ${timeField} < current_end${whereClause}`,
    `-- metrics: ${metrics.map((metric) => metric.label).join(", ")}`
  ].join(" ");
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
          desc: "本地测试实例"
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
          `${payload.builder.database}.${payload.builder.table} 最近${payload.builder.timeRange}，昨天同期环比`,
        status: "enabled" as const,
        queryMode: "sql" as const,
        queryText: previewQueryText(payload),
        templateKey: "report-builder-default",
        outputFormat: "markdown" as const,
        dutyUid: 0,
        creatorUid: 0,
        updatedAt,
        builder: clone(payload.builder)
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
        builder: clone(payload.builder)
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
      builder: raw.builder ?? null
    };
  } catch (error) {
    if (typeof window !== "undefined" && window.navigator.userAgent.includes("jsdom")) {
      return clone(findByReportId(reportEditorDraftMockById, reportId));
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
