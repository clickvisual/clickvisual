# ClickVisual Auth

clickvisual 有一个内置的用户认证系统，默认启用密码认证。默认账号/密码：clickvisual/clickvisual。

你也可以通过启用允许匿名访问来禁用身份验证，这样 clickvisual 就不需要登录直接可以访问。

用户认证设置
```toml
[auth]
mode = "memstore" # session可以使用memstore或者redis，默认使用内存模式，那么重启clickvisual，session会全部被清掉，如果上生产，建议使用redis模式
name = "clickvisual_session" # session名称
debug = true       
keypairs = "secret" # session加密对
# clickvisual如果上生产，建议使用redis模式，开启下面的配置信息
# redisSize = 10
# redisNetwork = "tcp"
# redisAddr = ""
# redisPassword = ""
```
允许匿名访问设置
```toml
[auth.anonymous]
# 默认不开启匿名设置，开启后clickvisual就无需身份验证，即可访问
enabled = false
```