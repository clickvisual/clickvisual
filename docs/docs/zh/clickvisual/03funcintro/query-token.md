# 日志查询 Token

日志查询 Token 用于给外部系统分配受控的日志查询能力。外部系统不需要登录 ClickVisual 页面，只需要携带 Token 调用机器查询接口；ClickVisual 会按 Token 授权的日志表校验权限，并记录查询审计。

## 管理入口

进入 v2 页面后打开：

`配置中心 -> 查询 Token`

只有 root 用户可以管理查询 Token。创建 Token 时需要填写名称、过期时间和授权日志表。Token 明文只在创建成功后展示一次，后续页面只展示 Token 前缀。

过期时间支持两种方式：

- `永不过期`：后端保存 `expireAt = 0`。
- `指定时间`：到期后 Token 不能继续查询。

## 授权范围

Token 的权限粒度是日志表。调用查询接口时，请求体里的 `tid` 必须属于该 Token 已授权的日志表，否则接口会返回权限校验失败。

授权日志表来自 ClickVisual 当前同步到数据库中的日志库树。如果页面里看不到目标日志表，先在配置中心执行数据结构同步。

## 查询接口

接口地址：

```text
POST /api/v2/query/token/run
```

如果 ClickVisual 部署在子路径下，例如 `/clickvisual`，接口地址需要带上子路径：

```text
POST /clickvisual/api/v2/query/token/run
```

Token 可以通过任意一种方式传入：

```http
Authorization: Bearer <token>
```

或：

```http
X-ClickVisual-Query-Token: <token>
```

## 请求体

请求体使用 v2 结构化查询格式：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `tid` | number | 是 | 日志表 ID，必须在 Token 授权范围内 |
| `st` | number | 是 | 开始时间，Unix 秒 |
| `et` | number | 是 | 结束时间，Unix 秒 |
| `page` | number | 否 | 页码，建议从 1 开始 |
| `pageSize` | number | 否 | 每页条数，最大 500 |
| `conditions` | array | 否 | 结构化筛选条件 |
| `sorts` | array | 否 | 排序字段 |
| `displayFields` | array | 否 | 返回展示字段 |

不要传旧版 `query` 字符串字段。该接口读取的是 `conditions`，`query` 字段不会作为筛选条件执行。

## 示例：全局匹配 `_raw_log_`

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

## 示例：精确匹配字段

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

## 响应

成功时返回 v2 查询结果，主要字段包括：

- `count`：命中的日志数量。
- `cost`：查询耗时，单位毫秒。
- `keys`：返回字段列表。
- `logs`：日志明细。
- `query` / `sql`：最终执行的 SQL。
- `plan`：查询计划和条件编译信息。

## 审计记录

每次 Token 查询都会记录审计信息，包括 Token、日志表、时间范围、分页、结果数量、耗时、状态、错误信息、客户端 IP 和 User-Agent。

可以在 `配置中心 -> 查询 Token` 页面点击对应 Token 的 `审计` 查看最近记录。

## 常见错误

`Couldn't connect to server`

说明目标端口没有服务监听，先确认 ClickVisual 后端实际端口，再替换请求地址。

`token is required` / `invalid token`

说明没有传 Token，或传入的不是创建时展示的一次性明文 Token。

`token is disabled` / `token is expired`

说明 Token 已被禁用或已过期，需要在配置中心调整状态或过期时间。

`permission verification failed`

说明请求的 `tid` 不在该 Token 授权范围内。

`pageSize must be <= 500`

说明单次请求超过最大分页限制，请降低 `pageSize`。
