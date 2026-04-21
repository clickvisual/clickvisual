# V2 Query Visual Filter Builder Design

## Background

`/v2/query` is moving away from freeform DSL input toward a visual filter builder for common log search workflows.

The target user flow is:

- choose `instance + database + table`
- choose a start and end time
- add multiple filter conditions
- join all conditions with `AND`
- run the query
- save the filter set for the current log scope
- share the filter through the existing v1 share capability

This first version is intentionally narrow. It should solve common operational filtering without introducing a full query editor.

## Goals

- Replace the current freeform DSL entry as the primary query input in `/v2/query`
- Support visual filter conditions with operators:
  - `=`
  - `!=`
  - `like`
  - `not like`
- Join all conditions with `AND`
- Preserve the existing query page shell:
  - left source tree
  - top time range picker
  - right results workspace
- Allow saved filters scoped by `instance + database + table`
- Reuse the existing v1 share button behavior for sharing filter state
- Keep generated query syntax aligned with ClickHouse semantics

## Non-Goals

- No `OR`
- No nested groups or parentheses
- No drag-and-drop condition sorting
- No raw DSL editing in the first version
- No bidirectional sync between visual filters and raw DSL text
- No cross-table saved filter reuse
- No advanced operators such as `IN`, `NOT IN`, range comparisons, regex, or existence checks

## User Experience

### Page Layout

The current page shell remains unchanged:

- left: three-level source tree for `instance / database / table`
- top-right: date range picker
- bottom-right: histogram and results panels

The current query input area becomes a two-column visual builder.

#### Left Column: Condition List

Displays all conditions in order. Each row represents one `AND` condition in compact form:

- `service / like / %gateway%`
- `level / != / info`
- `message / not like / %health%`

Each condition supports:

- select
- edit
- delete

The column also includes:

- `新增条件`
- current saved filter quick list for the same `instance + database + table`

#### Right Column: Condition Editor

Edits the currently selected condition.

Fields:

- field selector
- operator selector
- value editor

Actions:

- `执行查询`
- `保存筛选`
- `分享`

The query should remain runnable even with a single condition. Empty condition rows should not be allowed to participate in execution.

### Saved Filters

Saved filters are isolated by:

- `instance_id`
- `database_name`
- `table_name`

The first version supports:

- create saved filter
- overwrite existing saved filter
- load saved filter
- delete saved filter

### Share

Sharing should reuse the existing v1 share entry point and workflow.

The shared payload should restore:

- instance
- database
- table
- time range
- condition list

The shared representation should be structured filter state, not raw DSL text.

## Data Model

### Condition Model

```ts
type FilterCondition = {
  id: string;
  field: string;
  operator: "=" | "!=" | "like" | "not like";
  value: string | number;
  valueType: "string" | "number";
};
```

### Saved Filter Model

```ts
type SavedFilter = {
  id: string;
  name: string;
  instanceId: number;
  instanceName: string;
  database: string;
  table: string;
  timeRange: {
    startTime: string;
    endTime: string;
  };
  conditions: FilterCondition[];
  createdAt: string;
  updatedAt: string;
};
```

## Query Generation Rules

All conditions are joined in UI order with `AND`.

### Operators

- `=` generates `field = value`
- `!=` generates `field != value`
- `like` generates `field like value`
- `not like` generates `field not like value`

### Value Handling

The generated query should match ClickHouse syntax expectations as closely as possible.

- string fields:
  - frontend should safely quote the value as a string literal
- number fields:
  - frontend should emit the numeric value directly
- `like` and `not like`:
  - only valid for string fields
  - frontend must not auto-insert `%`
  - user input is treated as the exact right-hand side content for ClickHouse `like`

Examples:

- `service = 'gateway'`
- `status != 500`
- `message like '%timeout%'`
- `content not like '%health%'`

### Field Types

Field type information should reuse existing field metadata where possible. If the current field metadata path is backed by `cv_collect`, that metadata source may continue to be reused.

Saved filter records themselves should not be stored in log data tables or mixed with collection data tables.

## Persistence Design

The first version should use a dedicated table for saved visual filters.

Recommended table name:

- `query_filter_profiles`

Suggested schema:

```sql
CREATE TABLE query_filter_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  name VARCHAR(128) NOT NULL DEFAULT '' COMMENT '筛选名称',
  instance_id BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '实例 ID',
  instance_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '实例名称',
  database_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '数据库名',
  table_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '表名',
  start_time DATETIME NOT NULL COMMENT '开始时间',
  end_time DATETIME NOT NULL COMMENT '结束时间',
  conditions_json JSON NOT NULL COMMENT '筛选条件 JSON',
  creator VARCHAR(128) NOT NULL DEFAULT '' COMMENT '创建人',
  updater VARCHAR(128) NOT NULL DEFAULT '' COMMENT '更新人',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME NULL DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  KEY idx_scope (instance_id, database_name, table_name),
  KEY idx_creator (creator),
  KEY idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日志查询筛选条件配置';
```

### conditions_json Example

```json
[
  {
    "id": "cond_1",
    "field": "service",
    "operator": "=",
    "value": "gateway",
    "valueType": "string"
  },
  {
    "id": "cond_2",
    "field": "status",
    "operator": "!=",
    "value": 500,
    "valueType": "number"
  },
  {
    "id": "cond_3",
    "field": "message",
    "operator": "like",
    "value": "%timeout%",
    "valueType": "string"
  }
]
```

### Constraints

- soft delete via `deleted_at`
- list queries must filter `deleted_at IS NULL`
- name should be unique within:
  - `instance_id + database_name + table_name + creator`

## API Scope

Recommended first-version API surface:

- `POST /api/v2/query/filters`
  - create a saved filter
- `PUT /api/v2/query/filters/:id`
  - update a saved filter
- `GET /api/v2/query/filters`
  - list saved filters by `instance_id + database_name + table_name`
- `GET /api/v2/query/filters/:id`
  - get filter detail
- `DELETE /api/v2/query/filters/:id`
  - soft delete a saved filter

The share API should continue to use the existing v1 share flow, but the payload should contain structured visual filter state.

## Error Handling

The visual builder should prevent invalid states before execution whenever possible.

Cases to handle:

- no selected table
- invalid time range
- empty condition list
- condition missing field
- condition missing operator
- condition missing value
- `like` or `not like` used on non-string fields
- malformed number value for numeric fields

Recommended behavior:

- block query execution
- show inline error in the condition editor
- preserve user input

## Testing Scope

The first version should include tests for:

- condition add, edit, and delete
- condition list rendering
- operator-specific value handling
- type-aware query generation
- query execution with multiple `AND` conditions
- saved filter create and load flows
- saved filter scope isolation by `instance + database + table`
- share payload generation and state restoration

## Recommended Delivery Order

1. replace query input with visual condition builder shell
2. add condition model and query generation
3. wire type-aware validation
4. add saved filter backend table and APIs
5. connect saved filter UI
6. reuse v1 share entry with structured payload
7. add regression tests

## Open Decisions Already Resolved

- primary mode is visual filter editing only
- operators are `=`, `!=`, `like`, `not like`
- saved filter scope is `instance + database + table`
- saved filter content includes `conditions + timeRange`
- field values are type-aware
- saved filters should use a dedicated persistence table
- share should reuse the v1 share path
