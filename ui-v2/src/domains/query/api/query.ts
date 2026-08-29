import { client, type RequestOptions } from "../../../shared/http/client";
import type {
  AIDraftResponse,
  AILinkAnalyzeInput,
  QueryAccessLogLibraryPayload,
  QueryAnalysisFieldsResponse,
  QueryCreateDatabasePayload,
  QueryAutocompleteResponse,
  DetectIngestionPayload,
  DetectionResult,
  IngestionFieldsPayload,
  IngestionPublishDraftPayload,
  IngestionPublishRequest,
  IngestionPublishResult,
  QueryAIRunRequest,
  QueryFilterDeleteResult,
  QueryFieldStatsRequest,
  QueryFieldStatsResponse,
  QueryFilterListParams,
  QueryFilterProfile,
  QueryManageInstance,
  QueryFilterUpsertPayload,
  QueryHistogramBucket,
  QueryLogsParams,
  QueryLogsResponse,
  QueryPlan,
  QueryRequestV2,
  QueryRunResponse,
  QueryableField,
  PublishDraft,
  QueryShortUrlCreatePayload,
  QuerySourceDatabase,
  QuerySourceInstance,
  QuerySourceTable,
  QueryUpdateDatabasePayload,
  QueryTableIdPayload
} from "../types/contracts";

function buildQueryString(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      searchParams.set(key, String(value));
    }
  });
  return searchParams.toString();
}

interface BaseTreeTable {
  id: number;
  did: number;
  tableName: string;
  desc?: string;
}

interface BaseTreeDatabase {
  id: number;
  iid: number;
  databaseName: string;
  desc?: string;
  cluster?: string;
  tables?: BaseTreeTable[];
}

interface BaseTreeInstance {
  id: number;
  instanceName: string;
  desc: string;
  databases?: BaseTreeDatabase[];
}

interface SettingsInstanceItem {
  id: number;
  name: string;
  clusters?: string[];
  mode: number;
}

interface ExistingDatabaseItem {
  name?: string;
}

interface ExistingTableItem {
  name?: string;
}

function normalizeSourceTree(instances: BaseTreeInstance[] | null | undefined): QuerySourceInstance[] {
  if (!Array.isArray(instances)) {
    return [];
  }
  return instances.map((instance) => ({
    id: instance.id,
    name: instance.instanceName,
    desc: instance.desc || "",
    databases: Array.isArray(instance.databases)
      ? instance.databases.map((database) => ({
          id: database.id,
          iid: database.iid,
          name: database.databaseName,
          desc: database.desc,
          cluster: database.cluster,
          tables: Array.isArray(database.tables)
            ? database.tables.map((table) => ({
                id: table.id,
                did: table.did,
                name: table.tableName,
                desc: table.desc
              }))
            : []
        }))
      : []
  }));
}

export async function listQuerySourceInstances(): Promise<QuerySourceInstance[]> {
  const data = await client.get<BaseTreeInstance[]>("/api/v2/base/instances");
  return normalizeSourceTree(data);
}

export async function listQuerySourceDatabases(
  instanceId: number
): Promise<QuerySourceDatabase[]> {
  const instances = await listQuerySourceInstances();
  return instances.find((instance) => instance.id === instanceId)?.databases ?? [];
}

export async function listQuerySourceTables(
  instanceId: number,
  database: string
): Promise<QuerySourceTable[]> {
  const instances = await listQuerySourceInstances();
  return (
    instances
      .find((instance) => instance.id === instanceId)
      ?.databases.find((item) => item.name === database)
      ?.tables ?? []
  );
}

export async function listQueryManageInstances(): Promise<QueryManageInstance[]> {
  const data = await client.get<SettingsInstanceItem[]>("/api/v2/base/settings/instances");
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    clusters: Array.isArray(item.clusters) ? item.clusters : [],
    mode: item.mode ?? 0
  }));
}

export async function listQueryExistingDatabases(instanceId: number): Promise<string[]> {
  const data = await client.get<Array<string | ExistingDatabaseItem>>(
    `/api/v1/instances/${instanceId}/databases-exist`
  );
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      return String(item?.name ?? "").trim();
    })
    .filter(Boolean);
}

export async function listQueryExistingTables(
  instanceId: number,
  database: string
): Promise<string[]> {
  const data = await client.get<Array<string | ExistingTableItem>>(
    `/api/v2/query/instances/${instanceId}/databases/${encodeURIComponent(database)}/tables`
  );
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      return String(item?.name ?? "").trim();
    })
    .filter(Boolean);
}

export async function createQueryDatabase(
  instanceId: number,
  payload: QueryCreateDatabasePayload
): Promise<void> {
  await client.post<void>(`/api/v1/instances/${instanceId}/databases`, payload);
}

export async function accessQueryLogLibrary(
  instanceId: number,
  payload: QueryAccessLogLibraryPayload
): Promise<void> {
  await client.post<void>(`/api/v1/instances/${instanceId}/tables-exist`, payload);
}

export async function updateQueryDatabase(
  databaseId: number,
  payload: QueryUpdateDatabasePayload
): Promise<void> {
  await client.patch<void>(`/api/v1/databases/${databaseId}`, payload);
}

export async function deleteQueryDatabase(databaseId: number): Promise<void> {
  await client.delete<void>(`/api/v1/databases/${databaseId}`);
}

export async function deleteQueryTable(tableId: number): Promise<void> {
  await client.delete<void>(`/api/v1/tables/${tableId}`);
}

export async function resolveQueryTableId(payload: QueryTableIdPayload): Promise<number> {
  const query = buildQueryString(payload);
  return client.get<number>(`/api/v1/table/id?${query}`);
}

export async function getQueryLogs(
  tableId: number,
  params: QueryLogsParams,
  options?: RequestOptions
): Promise<QueryLogsResponse> {
  const query = buildQueryString(params);
  return client.get<QueryLogsResponse>(`/api/v1/tables/${tableId}/logs?${query}`, options);
}

export async function getQueryCharts(
  tableId: number,
  params: QueryLogsParams,
  options?: RequestOptions
): Promise<QueryHistogramBucket[]> {
  const query = buildQueryString(params);
  const data = await client.get<{ histograms?: QueryHistogramBucket[] } | QueryHistogramBucket[]>(
    `/api/v1/tables/${tableId}/charts?${query}`,
    options
  );
  if (Array.isArray(data)) {
    return data;
  }
  return Array.isArray(data.histograms) ? data.histograms : [];
}

export async function getQueryAnalysisFields(
  tableId: number
): Promise<QueryAnalysisFieldsResponse> {
  const data = await client.get<
    | QueryAnalysisFieldsResponse
    | {
        baseFields?: Array<string | QueryAnalysisFieldsResponse["baseFields"][number]>;
        logFields?: Array<string | QueryAnalysisFieldsResponse["logFields"][number]>;
      }
    | null
  >(
    `/api/v2/storage/${tableId}/analysis-fields`
  );
  const normalize = (items: unknown): QueryAnalysisFieldsResponse["baseFields"] => {
    if (!Array.isArray(items)) {
      return [];
    }
    return items
      .map((item) => {
        if (typeof item === "string") {
          return { field: item, orderField: item };
        }
        if (item && typeof item === "object" && "field" in item) {
          return item as QueryAnalysisFieldsResponse["baseFields"][number];
        }
        return null;
      })
      .filter((item): item is QueryAnalysisFieldsResponse["baseFields"][number] => Boolean(item?.field));
  };
  return {
    baseFields: normalize(data?.baseFields),
    logFields: normalize(data?.logFields),
    supportsGlobalMatch: data?.supportsGlobalMatch
  };
}

export async function runQueryV2(
  payload: QueryRequestV2,
  options?: RequestOptions
): Promise<QueryRunResponse> {
  return client.post<QueryRunResponse>("/api/v2/query/run", payload, options);
}

export async function getQueryFieldStats(
  payload: QueryFieldStatsRequest,
  options?: RequestOptions
): Promise<QueryFieldStatsResponse> {
  return client.post<QueryFieldStatsResponse>("/api/v2/query/field-stats", payload, options);
}

export async function getQueryAutocomplete(
  instanceId: number,
  query: string
): Promise<QueryAutocompleteResponse> {
  return client.post<QueryAutocompleteResponse>(`/api/v1/instances/${instanceId}/complete`, {
    query
  });
}

export async function listQueryFilters(params: QueryFilterListParams): Promise<QueryFilterProfile[]> {
  const query = buildQueryString(params);
  return client.get<QueryFilterProfile[]>(`/api/v2/query/filters?${query}`);
}

export async function getQueryFilter(id: number): Promise<QueryFilterProfile> {
  return client.get<QueryFilterProfile>(`/api/v2/query/filters/${id}`);
}

export async function createQueryFilter(
  payload: QueryFilterUpsertPayload
): Promise<QueryFilterProfile> {
  return client.post<QueryFilterProfile>("/api/v2/query/filters", payload);
}

export async function updateQueryFilter(
  id: number,
  payload: QueryFilterUpsertPayload
): Promise<QueryFilterProfile> {
  return client.put<QueryFilterProfile>(`/api/v2/query/filters/${id}`, payload);
}

export async function deleteQueryFilter(id: number): Promise<QueryFilterDeleteResult> {
  return client.delete<QueryFilterDeleteResult>(`/api/v2/query/filters/${id}`);
}

export async function createQueryShareShortUrl(
  payload: QueryShortUrlCreatePayload
): Promise<string> {
  return client.post<string>("/api/v2/base/shorturls", payload);
}

export async function detectIngestionShape(
  payload: DetectIngestionPayload
): Promise<DetectionResult> {
  return client.post<DetectionResult>("/api/v2/query/ingestion/detect", payload);
}

export async function listQueryableFields(
  payload: IngestionFieldsPayload
): Promise<QueryableField[]> {
  return client.post<QueryableField[]>("/api/v2/query/ingestion/fields", payload);
}

export async function compileStructuredQuery(
  payload: QueryRequestV2
): Promise<{ sql: string; plan: QueryPlan }> {
  return client.post<{ sql: string; plan: QueryPlan }>("/api/v2/query/compile", payload);
}

export async function buildPublishDraft(
  payload: IngestionPublishDraftPayload
): Promise<PublishDraft> {
  return client.post<PublishDraft>("/api/v2/query/ingestion/publish-draft", payload);
}

export async function publishIngestion(
  payload: IngestionPublishRequest
): Promise<IngestionPublishResult> {
  return client.post<IngestionPublishResult>("/api/v2/query/ingestion/publish", payload);
}

export async function runQueryAIDraft<TInput>(
  payload: QueryAIRunRequest<TInput>
): Promise<AIDraftResponse> {
  return client.post<AIDraftResponse>("/api/v2/ai/run", payload);
}

export async function runQueryLinkAIAnalysis(input: AILinkAnalyzeInput): Promise<AIDraftResponse> {
  return client.post<AIDraftResponse>("/api/v2/ai/run", {
    scenario: "query.link.analyze",
    input,
    options: {
      temperature: 0.1,
      maxTokens: 1200
    }
  });
}
