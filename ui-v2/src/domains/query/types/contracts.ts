export interface QuerySourceTable {
  id: number;
  did: number;
  name: string;
  desc?: string;
}

export interface QuerySourceDatabase {
  id: number;
  iid: number;
  name: string;
  desc?: string;
  cluster?: string;
  tables: QuerySourceTable[];
}

export interface QuerySourceInstance {
  id: number;
  name: string;
  desc: string;
  databases: QuerySourceDatabase[];
}

export interface QuerySourceTreeTarget {
  instanceId?: number | null;
  databaseName?: string;
  tableName?: string;
}

export interface QueryManageInstance {
  id: number;
  name: string;
  clusters: string[];
  mode: number;
}

export interface QueryCreateDatabasePayload {
  databaseName: string;
  cluster?: string;
  desc: string;
  type: number;
}

export interface QueryUpdateDatabasePayload {
  cluster?: string;
  desc: string;
}

export interface QueryAccessLogLibraryPayload {
  databaseName: string;
  tableName: string;
  timeField: string;
  timeFieldType: number;
  cluster?: string;
  desc: string;
}

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

export interface QueryStorageAnalysisField {
  id?: number;
  tid?: number;
  field: string;
  rootName?: string;
  typ?: number;
  hashTyp?: number;
  alias?: string;
  orderField?: string;
}

export interface QueryAnalysisFieldsResponse {
  baseFields: QueryStorageAnalysisField[];
  logFields: QueryStorageAnalysisField[];
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
  isTrace?: number;
}

export interface QueryAutocompleteResponse {
  logs: Array<Record<string, unknown>>;
  isNeedSort: boolean;
  sortRule: string[];
}

export type QueryFilterOperator = "=" | "!=" | "like" | "not like" | ">" | ">=" | "<" | "<=";

export type QueryFilterValueType = "string" | "number" | "datetime";

export interface QueryFilterCondition {
  id: string;
  field: string;
  operator: QueryFilterOperator;
  value: string | number;
  valueType: QueryFilterValueType;
  disabled?: boolean;
}

export interface QueryFilterTimeRange {
  startTime: string;
  endTime: string;
}

export interface QueryFilterProfile {
  id: number;
  name: string;
  instanceId: number;
  instanceName: string;
  database: string;
  table: string;
  timeRange: QueryFilterTimeRange;
  conditions: QueryFilterCondition[];
  creator: string;
  updater: string;
  ctime: number;
  utime: number;
}

export interface QueryFilterListParams {
  instanceId: number;
  database: string;
  table: string;
}

export interface QueryFilterUpsertPayload {
  name: string;
  instanceId: number;
  instanceName: string;
  database: string;
  table: string;
  timeRange: QueryFilterTimeRange;
  conditions: QueryFilterCondition[];
}

export interface QueryFilterDeleteResult {
  id: number;
}

export interface QueryShortUrlCreatePayload {
  originUrl: string;
}

export type QueryFieldSource = "column" | "json_path" | "tag_path" | "derived";

export type QueryValueType = "string" | "number" | "boolean" | "datetime" | "unknown";

export type QueryOperatorV2 =
  | "="
  | "!="
  | "contains"
  | "not_contains"
  | "in"
  | ">"
  | ">="
  | "<"
  | "<="
  | "between"
  | "exists"
  | "not_exists"
  | "is_true"
  | "is_false";

export interface QueryFieldRef {
  fieldKey: string;
  displayName: string;
  source: QueryFieldSource;
  path: string;
  valueType: QueryValueType;
  isAccelerated: boolean;
  acceleratedCol?: string;
}

export interface QueryConditionV2 {
  field: QueryFieldRef;
  operator: QueryOperatorV2;
  value?: unknown;
  valueTo?: unknown;
}

export interface QuerySort {
  fieldKey: string;
  descending: boolean;
}

export interface QueryRequestV2 {
  tid: number;
  st: number;
  et: number;
  page: number;
  pageSize: number;
  conditions: QueryConditionV2[];
  sorts: QuerySort[];
  displayFields: string[];
}

export interface PlannedCondition {
  fieldKey: string;
  execution: string;
  expression: string;
  highCost: boolean;
  warningCode?: string;
}

export interface QueryWarning {
  code: string;
  level: string;
  message: string;
}

export interface QueryPlan {
  table: string;
  plannedConditions: PlannedCondition[];
  warnings: QueryWarning[];
  orderBy: string[];
}

export interface QueryRunResponse extends QueryLogsResponse {
  sql: string;
  plan: QueryPlan;
}

export interface Candidate {
  path: string;
  label: string;
  confidence: number;
  reason: string;
}

export interface DetectionResult {
  timeCandidates: Candidate[];
  bodyCandidates: Candidate[];
  tagCandidates: Candidate[];
  nestedJsonCandidates: Candidate[];
  risks: QueryWarning[];
  samplePreview: Array<Record<string, unknown>>;
}

export interface NormalizationDraft {
  timePath: string;
  bodyPath: string;
  tagPath: string;
  needNestedJson: boolean;
  nestedJsonPath?: string;
  requiresConfirm: boolean;
}

export interface QueryableField {
  fieldKey: string;
  displayName: string;
  path: string;
  source: QueryFieldSource;
  valueType: QueryValueType;
  isScalar: boolean;
  coverage: number;
  stability: number;
  recommendedOperators: QueryOperatorV2[];
  isAccelerated: boolean;
  accelerationStatus: string;
  examples?: string[];
}

export interface PublishDraft {
  sourceType: string;
  normalization: NormalizationDraft;
  queryableFields: QueryableField[];
  defaultFields: string[];
  warnings: QueryWarning[];
  requiresConfirm: boolean;
}

export interface IngestionPublishTarget {
  instanceId: number;
  databaseName: string;
  tableName: string;
  timeFieldType: number;
  cluster?: string;
  desc: string;
}

export interface IngestionPublishRequest {
  sourceType: IngestionSourceType;
  normalization: NormalizationDraft;
  queryableFields: QueryableField[];
  defaultFields: string[];
  target: IngestionPublishTarget;
}

export interface IngestionPublishResult {
  instanceId: number;
  databaseId: number;
  databaseName: string;
  tableId: number;
  tableName: string;
  fieldCount: number;
  defaultFields: string[];
}

export interface AIDecision {
  key: string;
  title: string;
  description: string;
}

export interface AISuggestion {
  type: string;
  title: string;
  description: string;
  payload?: unknown;
}

export interface AIDraftResponse {
  summary: string;
  decisions: AIDecision[];
  risks: QueryWarning[];
  suggestions: AISuggestion[];
  requiresUserConfirmation: boolean;
}

export type QueryAIScenario =
  | "query.ingestion.detect_explain"
  | "query.ingestion.field_recommend"
  | "query.ingestion.publish_summary"
  | "query.link.analyze";

export interface QueryAIRunOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface QueryAIRunRequest<TInput = unknown> {
  scenario: QueryAIScenario;
  input: TInput;
  options?: QueryAIRunOptions;
}

export interface AIIngestionDetectExplainInput {
  result: DetectionResult;
}

export interface AIIngestionFieldRecommendInput {
  fields: QueryableField[];
}

export interface AIIngestionPublishSummaryInput {
  normalization: NormalizationDraft;
  fields: QueryableField[];
  defaultFields: string[];
  warnings: QueryWarning[];
}

export interface AILinkLogSource {
  tableId: number;
  databaseName: string;
  tableName: string;
}

export interface AILinkLogItem {
  sequence: number;
  source: AILinkLogSource;
  time: string;
  timeSource: string;
  level: string;
  message: string;
  fields: Record<string, unknown>;
}

export interface AILinkAnalyzeInput {
  anchorField: string;
  anchorValue: string;
  anchorTime: number;
  windowMinutes: number;
  query: string;
  range: {
    st: number;
    et: number;
  };
  tables: AILinkLogSource[];
  logs: AILinkLogItem[];
}

export type IngestionSourceType = "kafka_json";

export type IngestionStep = "source" | "detect" | "normalize" | "fields" | "publish";

export interface DetectIngestionPayload {
  samples: Array<Record<string, unknown>>;
}

export interface IngestionFieldsPayload {
  samples: Array<Record<string, unknown>>;
  draft: NormalizationDraft;
}

export interface IngestionPublishDraftPayload {
  sourceType: IngestionSourceType;
  normalization: NormalizationDraft;
  queryableFields: QueryableField[];
  defaultFields: string[];
}
