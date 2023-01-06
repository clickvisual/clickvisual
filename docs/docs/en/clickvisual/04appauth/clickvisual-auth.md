# ClickVisual Auth

 ClickVisual has a built-in user authentication system,password authentication is enabled by default.Default account/password:clickvisual/clickvisual.


When anonymous authentication is enabled,your can access ClickvVisual withou login.


User Auth Config
```toml
[auth]
mode = "memstore" # Default Mode is memory mode and the session will be all cleared when restart clickvisual.It is recommended to use redis mode in production environment.
name = "clickvisual_session" # session name
debug = true       
keypairs = "secret" # session key pairs
# To use redis mode,you need to enable the settings below
# redisSize = 10
# redisNetwork = "tcp"
# redisAddr = ""
# redisPassword = ""
```
Enable anonymous access setting
```toml
[auth.anonymous]
# default is false
enabled = false
```