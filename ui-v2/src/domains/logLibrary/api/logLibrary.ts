import { client } from "../../../shared/http/client";
import { listQuerySourceInstances } from "../../query/api/query";
import type { QuerySourceInstance } from "../../query/types/contracts";

export interface LogLibraryRow {
  id: number;
  iid: number;
  instanceName: string;
  databaseId: number;
  databaseName: string;
  tableName: string;
  desc?: string;
}

export interface TableColumnMetadata {
  name: string;
  type: number;
  typeDesc: string;
}

export interface LogLibraryPhysicalTable {
  name: string;
  role?: string;
  columns?: TableColumnMetadata[];
  ddl?: string;
}

export interface CreateLogLibraryPayload {
  databaseId: number;
  tableName: string;
  typ: number;
  days: number;
  brokers: string;
  topics: string;
  consumers: number;
  timeField: string;
  rawLogField: string;
  source: string;
  createType?: number;
  timeFieldParent?: string;
  rawLogFieldParent?: string;
}

export interface LogLibraryJSONField {
  key: string;
  parent?: string;
  path: string;
  type: string;
  isTime?: boolean;
  isRawLog?: boolean;
}

export interface LogLibraryJSONPreview {
  mode: "standalone" | "cluster";
  tableCount: number;
  tableRoles: string[];
  timeField: string;
  timeFieldParent?: string;
  timeFieldType: number;
  rawLogField: string;
  rawLogFieldParent?: string;
  fields: LogLibraryJSONField[];
  timeCandidates: LogLibraryJSONCandidate[];
  rawLogCandidates: LogLibraryJSONCandidate[];
}

export interface LogLibraryJSONCandidate {
  key: string;
  parent?: string;
  path: string;
  type: string;
  timeFieldType?: number;
}

export interface AccessExistingTablePayload {
  databaseName: string;
  tableName: string;
  timeField: string;
  timeFieldType: number;
}

export async function checkRoot() {
  try {
    await client.post<void>("/api/v1/pms/check", { objectType: "root" });
    return true;
  } catch {
    return false;
  }
}

export async function listLogLibraries(): Promise<LogLibraryRow[]> {
  const instances = await listQuerySourceInstances();
  return instances.flatMap((instance: QuerySourceInstance) =>
    instance.databases.flatMap((database) =>
      database.tables.map((table) => ({
        id: table.id,
        iid: instance.id,
        instanceName: instance.name,
        databaseId: database.id,
        databaseName: database.name,
        tableName: table.name,
        desc: table.desc,
      })),
    ),
  );
}

export function createLogLibrary(payload: CreateLogLibraryPayload) {
  return client.post<void>(
    "/api/v2/base/log-library-management/storage",
    payload,
  );
}

export function previewLogLibraryJSON(databaseId: number, source: string) {
  return client.post<LogLibraryJSONPreview>(
    "/api/v2/base/log-library-management/storage/preview-json",
    { databaseId, source },
  );
}

export function accessExistingTable(
  instanceId: number,
  payload: AccessExistingTablePayload,
) {
  return client.post<void>(
    `/api/v2/base/log-library-management/instances/${instanceId}/tables-exist`,
    payload,
  );
}

export function deleteLogLibrary(id: number) {
  return client.delete<void>(
    `/api/v2/base/log-library-management/tables/${id}`,
  );
}

export function getTableColumns(iid: number, database: string, table: string) {
  return client.get<{ tables: LogLibraryPhysicalTable[] }>(
    `/api/v2/base/log-library-management/instances/${iid}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/columns`,
  );
}

export function getTableDDL(iid: number, database: string, table: string) {
  return client.get<{ tables: LogLibraryPhysicalTable[] }>(
    `/api/v2/base/log-library-management/instances/${iid}/databases/${encodeURIComponent(database)}/tables/${encodeURIComponent(table)}/ddl`,
  );
}
