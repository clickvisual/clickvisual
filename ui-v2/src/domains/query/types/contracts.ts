import type {
  ReportSourceDatabase,
  ReportSourceInstance,
  ReportSourceTable
} from "../../report/types/contracts";

export type QuerySourceInstance = ReportSourceInstance;
export type QuerySourceDatabase = ReportSourceDatabase;
export type QuerySourceTable = ReportSourceTable;

export interface QueryTableIdPayload {
  instance: string;
  database: string;
  datasource: string;
  table: string;
}

export interface QueryLogsParams {
  st: number;
  et: number;
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface QueryHistogramBucket {
  count: number;
  from: number;
  to: number;
  progress: string;
}

export interface QueryAnalysisFieldsResponse {
  baseFields: string[];
  logFields: string[];
}

export interface QueryLogsField {
  field: string;
  alias: string;
}

export interface QueryLogsResponse {
  count: number;
  cost: number;
  keys: QueryLogsField[];
  logs: Array<Record<string, unknown>>;
  query: string;
}

export interface QueryAutocompleteResponse {
  logs: Array<Record<string, unknown>>;
  isNeedSort: boolean;
  sortRule: string[];
}
