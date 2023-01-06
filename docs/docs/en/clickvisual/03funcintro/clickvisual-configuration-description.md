# ClickVisual Config

This article mainly describes the configuration items of ClickVisual startup in detail.

Description of app segment configuration:
```toml
[app]
# OAuth sign and issue secretKey required for hashstatecode
secretKey = "secretKey"
# If the clickvisual domain name is configured, you need to configure the rootURL as the clickvisual domain name　　　　　　　
rootURL = "https://dev.clickvisual.com/"
# URL accessed by default after login
baseURL = "/api/admin/login/"
# Metadata fields to be hidden in log query　　　　
hiddenFields = ["_cluster_", "_log_agent_", "_node_ip_", "_node_name_", "_time_second_", "_time_nanosecond_", "_source_"]
# Metadata fields to be displayed in log query
defaultFields = ["_namespace_","_container_name_","_pod_name_","_time_second_"]
# Menu access permission configuration file path
permissionFile = "./config/resource.yaml"
# Limit the maximum query time span in hours, 0 or left blank means unlimited
queryLimitHours = 24
```

logger segment configuration description:
```toml
[logger]
# Log level,Optional: debug|info|warn|error|panic|fatal. It is recommended to select debug for the test environment and error for the production environment
level = "debug"
# Log Output: writer，Optional: file|stderr
writer = "stderr"
# If writer is file，dir configuration works and indicates the output log file directory
dir = "./logs"
# If writer is file，name configuration works and indicates the log file name
name = "default.log"
```

server segment configuration description
```toml
# ClickVisual API Server Config
[server.http]
# Started HTTP API Server Host
host = "0.0.0.0"
# Started HTTP API Server Port
port = 9001

# ClickVisual governor Server Config，governor provides metrics collection, profiling debugging, log level adjustment, etc.
[server.governor]
# Started HTTP Governor Server Host
host = "0.0.0.0"
# Started HTTP Governor Server Port
port = 9003
```

mysql segment configuration description
```toml
[mysql]
# The maximum lifetime of the connection is 300s by default
connMaxLifetime = "300s"
# Whether to enable the debug mode. Plain SQL will be printed in the debug mode.
debug = true
# DSN connection string of MySQL instance
dsn = "root:root@tcp(127.0.0.1:3306)/clickvisual?charset=utf8mb4&collation=utf8mb4_general_ci&parseTime=True&loc=Local&readTimeout=1s&timeout=1s&writeTimeout=3s"
# Log Level
level = "error"
# Maximum idle connections
maxIdleConns = 5
# Maximum open connections
maxOpenConns = 50
```

auth segment configuration description
```toml
[auth]
# Using redis to store users session
mode = "redis"
# Component name,default: clickvisual-session 
name = "clickvisual-session"
keypairs = "secret"
redisSize = 10
redisNetwork = "tcp"
# redis instance address，use 127.0.0.1:6379 by default,update that when you need
redisAddr = "127.0.0.1:6379"
# redis password,default to empty
redisPassword = "

# Anonymous access config
[auth.anonymous]
# Enable/disable anonymous access
enabled = false

# auth proxy config
[auth.proxy]
# Enable proxy mode
enabled = true
# In proxy mode,'x-clickvisual-user'is used by default to read username
headerName = "X-clickvisual-USER"

# Third party login config
[[auth.tps]]
# Third party login type，now set as 'github'
typ = "github"
# Enable or not
enable = true
# Whether to register silently
allowSignUp = true
# Apply Client ID
clientId = ""
# Apply Client Secret
clientSecret = ""
# Scopes of authorization
scopes = ["user:email", "read:org"]
# Third party authorized address
authUrl = "https://github.com/login/oauth/authorize"
# Third party access_token address
tokenUrl = "https://github.com/login/oauth/access_token"
# Third party api address
apiUrl = "https://api.github.com/user"
allowedDomains = []
teamIds = []
allowedOrganizations = []

# Third party login config
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