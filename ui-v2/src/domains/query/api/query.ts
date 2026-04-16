import {
  listReportSourceDatabases,
  listReportSourceInstances,
  listReportSourceTables
} from "../../report/api/report";
import { client } from "../../../shared/http/client";
import type {
  QueryAnalysisFieldsResponse,
  QueryAutocompleteResponse,
  QueryHistogramBucket,
  QueryLogsParams,
  QueryLogsResponse,
  QuerySourceDatabase,
  QuerySourceInstance,
  QuerySourceTable,
  QueryTableIdPayload
} from "../types/contracts";

function buildQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

export function listQuerySourceInstances(): Promise<QuerySourceInstance[]> {
  return listReportSourceInstances();
}

export function listQuerySourceDatabases(
  instanceId: number
): Promise<QuerySourceDatabase[]> {
  return listReportSourceDatabases(instanceId);
}

export function listQuerySourceTables(
  instanceId: number,
  database: string
): Promise<QuerySourceTable[]> {
  return listReportSourceTables(instanceId, database);
}

export async function resolveQueryTableId(payload: QueryTableIdPayload): Promise<number> {
  const query = buildQueryString(payload);
  return client.get<number>(`/api/v1/table/id?${query}`);
}

export async function getQueryLogs(
  tableId: number,
  params: QueryLogsParams
): Promise<QueryLogsResponse> {
  const query = buildQueryString(params);
  return client.get<QueryLogsResponse>(`/api/v1/tables/${tableId}/logs?${query}`);
}

export async function getQueryCharts(
  tableId: number,
  params: QueryLogsParams
): Promise<QueryHistogramBucket[]> {
  const query = buildQueryString(params);
  const data = await client.get<{ histograms?: QueryHistogramBucket[] } | QueryHistogramBucket[]>(
    `/api/v1/tables/${tableId}/charts?${query}`
  );
  if (Array.isArray(data)) {
    return data;
  }
  return Array.isArray(data.histograms) ? data.histograms : [];
}

export async function getQueryAnalysisFields(
  tableId: number
): Promise<QueryAnalysisFieldsResponse> {
  const data = await client.get<QueryAnalysisFieldsResponse | null>(
    `/api/v2/storage/${tableId}/analysis-fields`
  );
  return {
    baseFields: Array.isArray(data?.baseFields) ? data.baseFields : [],
    logFields: Array.isArray(data?.logFields) ? data.logFields : []
  };
}

export async function getQueryAutocomplete(
  instanceId: number,
  query: string
): Promise<QueryAutocompleteResponse> {
  return client.post<QueryAutocompleteResponse>(`/api/v1/instances/${instanceId}/complete`, {
    query
  });
}
