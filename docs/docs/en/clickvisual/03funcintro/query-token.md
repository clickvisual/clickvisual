# Log Query Token

Log Query Token provides controlled log query access for external systems. The external system does not need to log in to the ClickVisual UI. It only needs to call the machine query API with a Token. ClickVisual checks the Token's table grants and records query audits.

## Management Entry

Open the v2 UI and go to:

`Settings -> Query Token`

Only root users can manage query Tokens. When creating a Token, set its name, expiration policy, and authorized log tables. The plain Token is shown only once after creation. Later the UI only shows the Token prefix.

The expiration policy supports two modes:

- `Never expires`: the backend stores `expireAt = 0`.
- `Specific time`: the Token becomes unusable after the expiration time.

## Authorization Scope

The permission granularity is log table. The `tid` in the query request body must belong to a table granted to the Token. Otherwise the API returns a permission verification failure.

Authorized tables are loaded from the log source tree stored in ClickVisual. If the target table is not visible, sync the data schema in the settings center first.

## Query API

Endpoint:

```text
POST /api/v2/query/token/run
```

If ClickVisual is deployed under a subpath such as `/clickvisual`, include the subpath:

```text
POST /clickvisual/api/v2/query/token/run
```

The Token can be passed in either header:

```http
Authorization: Bearer <token>
```

or:

```http
X-ClickVisual-Query-Token: <token>
```

## Request Body

The request body uses the v2 structured query format:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tid` | number | Yes | Log table ID. It must be granted to the Token. |
| `st` | number | Yes | Start time, Unix seconds. |
| `et` | number | Yes | End time, Unix seconds. |
| `page` | number | No | Page number. Usually starts from 1. |
| `pageSize` | number | No | Page size. The maximum is 500. |
| `conditions` | array | No | Structured filter conditions. |
| `sorts` | array | No | Sort fields. |
| `displayFields` | array | No | Fields to return. |

Do not use the legacy `query` string field. This API reads `conditions`; the `query` field is not executed as a filter.

## Example: Global Match on `_raw_log_`

```bash
curl -X POST 'http://localhost:5176/api/v2/query/token/run' \
  -H 'Content-Type: application/json' \
  -H 'X-ClickVisual-Query-Token: cvqt_xxx' \
  -d '{
    "tid": 171,
    "st": 1780538785,
    "et": 1780539685,
    "page": 1,
    "pageSize": 10,
    "conditions": [
      {
        "field": {
          "fieldKey": "_raw_log_",
          "displayName": "_raw_log_",
          "source": "column",
          "path": "_raw_log_",
          "valueType": "string",
          "isAccelerated": false
        },
        "operator": "contains",
        "value": "error"
      }
    ]
  }'
```

## Example: Exact Field Match

```bash
curl -X POST 'http://localhost:5176/api/v2/query/token/run' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer cvqt_xxx' \
  -d '{
    "tid": 171,
    "st": 1780538785,
    "et": 1780539685,
    "page": 1,
    "pageSize": 10,
    "conditions": [
      {
        "field": {
          "fieldKey": "lv",
          "displayName": "lv",
          "source": "column",
          "path": "lv",
          "valueType": "string",
          "isAccelerated": false
        },
        "operator": "=",
        "value": "error"
      }
    ]
  }'
```

## Response

On success, the API returns the v2 query result. Main fields include:

- `count`: matched log count.
- `cost`: query cost in milliseconds.
- `keys`: returned field list.
- `logs`: log records.
- `query` / `sql`: final SQL.
- `plan`: query plan and compiled condition information.

## Audit Logs

Every Token query records an audit entry, including Token, log table, time range, pagination, result count, cost, status, error message, client IP, and User-Agent.

Open `Settings -> Query Token` and click `Audit` on a Token to view recent records.

## Common Errors

`Couldn't connect to server`

The target port is not listening. Check the actual ClickVisual backend port and update the request URL.

`token is required` / `invalid token`

No Token was passed, or the value is not the one-time plain Token shown after creation.

`token is disabled` / `token is expired`

The Token is disabled or expired. Update its status or expiration policy in the settings center.

`permission verification failed`

The requested `tid` is not granted to this Token.

`pageSize must be <= 500`

The request exceeds the maximum page size. Lower `pageSize`.
