# 配置说明

本文主要对 clickvisual 启动的配置项做详细说明。

## app 段配置说明
```toml
[app]
# OAuth 签发 hashStatecode 所需的 secretKey
secretKey = "secretKey"
# 如果配置了 clickvisual 域名，需要将 rootURL 配置为 clickvisual 域名　　　　　　　
rootURL = "https://dev.clickvisual.com/"
# 登录后默认访问的 URL　
baseURL = "/api/admin/login/"
# 菜单配置文件，酌情调整菜单权限文件路径
permissionFile = "./config/resource.yaml"
# 限制最大查询时间跨度单位小时 0 或不填表示无限制
queryLimitHours = 24
```

## logger 段配置说明
```toml
[logger.default]
# 日志等级，可选 debug|info|warn|error|panic|fatal，建议测试环境选择 debug，生产环境选择 error
level = "debug"
# 日志输出 writer，可选 file|stderr
writer = "stderr"
# 如果 writer 是 file，dir 配置有效，表示输出日志文件目录
dir = "./logs"
# 如果 writer 是 file，name 配置有效，表示日志文件名
name = "default.log"
```

## server 段配置说明
```toml
# clickvisual API Server 配置
[server.http]
# 启动的 HTTP API Server Host
host = "0.0.0.0"
# 启动的 HTTP API Server Port
port = 9001

# clickvisual governor Server 配置，governor 用户提供 metrics 采集、profling 调试、日志级别调整等。
[server.governor]
# 启动的 HTTP Governor Server Host
host = "0.0.0.0"
# 启动的 HTTP Governor Server Port
port = 9003
```

## mysql 段配置说明
```toml
[mysql]
# 连接的最大存活时间，默认300s
connMaxLifetime = "300s"
# 是否开启 debug 模式，debug 模式下会打印 plain sql
debug = true
# MySQL 实例的 DSN 连接串
dsn = "root:root@tcp(127.0.0.1:3306)/clickvisual?charset=utf8mb4&collation=utf8mb4_general_ci&parseTime=True&loc=Local&readTimeout=1s&timeout=1s&writeTimeout=3s"
# 日志级别
level = "error"
# 最大空闲连接数
maxIdleConns = 5
# 最大活动连接数
maxOpenConns = 50
```

## auth 段配置说明
```toml
[auth]
mode = "memstore" # redis memstore
# 组件名，默认 clickvisual-session
name = "clickvisual-session"
keypairs = "secret"
# if use mode redis
# redisSize = 10
# redisNetwork = "tcp"
# redisAddr = ""
# redisPassword = ""

# 匿名访问配置
[auth.anonymous]
# 是否允许匿名访问
enabled = false

# auth 代理配置
[auth.proxy]
# 是否允许开启代理模式
enabled = true
# 代理模式下默认使用 'X-clickvisual-USER' 读取 username
headerName = "X-clickvisual-USER"

# 第三方登录配置
[[auth.tps]]
# 第三方登录类型，此处设置为 'github'
typ = "github"
# 是否启用
enable = true
# 是否静默注册
allowSignUp = true
# 应用 Client ID
clientId = ""
# 应用 Client Secret
clientSecret = ""
# 授权范围
scopes = ["user:email", "read:org"]
# 第三方授权地址
authUrl = "https://github.com/login/oauth/authorize"
# 第三方获取 access_token 地址
tokenUrl = "https://github.com/login/oauth/access_token"
# 第三方 api 地址
apiUrl = "https://api.github.com/user"
allowedDomains = []
teamIds = []
allowedOrganizations = []

# 第三方登录配置
[[auth.tps]]
typ = "gitlab"
enable = true
allowSignUp = true
clientId = ""
clientSecret = ""
scopes = ["api"]
authUrl = "https://mygitlab.com/oauth/authorize"
tokenUrl = "https://mygitlab.com/oauth/token"
apiUrl = "https://mygitlab.com/api/v4"
allowedDomains = []
teamIds = []
allowedOrganizations = []
```

## 多实例部署
```toml
[app]
isMultiCopy = true

[redis]
debug = true
addr = "127.0.0.1:6379"
writeTimeout = "3s"
password = "**"
```

## prometheus 代理配置
```toml
[prom2click]
enable = true

[[prom2click.cfgs]]
host = "127.0.0.1"
port = 9222
clickhouseDSN = "tcp://127.0.0.1:9000"
clickhouseDB = "metrics"
clickhouseTable = "samples"
```