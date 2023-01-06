# GitHub Oauth2

要启用 Github OAuth2，您需要在 Github 中注册应用程序。 Github 将生成一个客户端 ID 和密钥供您使用。

创建 GitHub OAuth 应用
你需要创建一个 Github Oauth 应用，选择一个描述性名称，并使用以下重定向 URI
```sh
https://clickvisual.example.com/login/github
```

在这里 https://clickvisual.example.com 是你访问 clickvisual 的地址。如果你没有使用 HTTPS，使用 IP+Port 方式，那么你需要将地址设置为
```sh
http://ip:port/login/github
```

开启 GitHub 功能
下面是开启Github授权的配置
```toml
[[auth.tps]]
typ = "github"
enable = true
allowSignUp = true
clientId = ""
clientSecret = ""
scopes = ["user:email", "read:org"]
authUrl = "https://github.com/login/oauth/authorize"
tokenUrl = "https://github.com/login/oauth/access_token"
apiUrl = "https://api.github.com/user"
allowedDomains = []
teamIds = []
allowedOrganizations = []
```

如果你访问 clickvisual 的地址不是 localhost，那么你在设置地址的时候，还需要将配置中 [app] 的 root_url 选项改成填写的地址，才能使回调 URL 正确。

重启 clickvisual 服务可以使得你的配置生效。