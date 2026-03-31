import {
  buildReportWorkspaceMock,
  reportEditorDraftMockById,
  reportChannelsMock,
  reportExecutionPreviewMockById,
  reportListMock,
  reportRecentExecutionsMockById,
  reportScheduleMockById,
  reportSendSummaryMockById
} from "../mocks/reportMockData";
import { client } from "../../../shared/http/client";
import type {
  ReportEditorDraft,
  ReportExecutionPreview,
  ReportExecutionRecord,
  ReportListItem,
  ReportPushChannel,
  ReportScheduleConfig,
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

export async function getReportScheduleConfig(
  reportId: number
): Promise<ReportScheduleConfig> {
  return clone(findByReportId(reportScheduleMockById, reportId));
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
    reportId: saved.nodeId,
    desc: saved.desc,
    dutyUid: saved.dutyUid,
    cron: saved.cron,
    typ: saved.typ,
    args: clone(payload.args),
    isRetry: saved.isRetry,
    retryTimes: saved.retryTimes,
    retryInterval: saved.retryInterval,
    channelIds: clone(saved.channelIds)
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
    return await client.get<ReportEditorDraft>(
      `/api/v2/reports/editor?reportId=${reportId}`
    );
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
    return await client.get<ReportWorkspace>(`/api/v2/reports/workspace${query}`);
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
