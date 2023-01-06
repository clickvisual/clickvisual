# GitHub Oauth2

To enable Github OAuth2, you need to register the application in Github. Github will generate a client ID and secret for you to use.

Create GitHub OAuth Application

You need to create a GitHub OAuth Application,choose a descriptive name,and use the redirect URI below:
```sh
https://clickvisual.example.com/login/github
```

Here https://clickvisual.example.com is the URL where you access ClickVisual. If you are not using HTTPS and using the IP+Port method, then you need to set the address to :
```sh
http://ip:port/login/github
```

Enable Github OAuth2 Config
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
If the URL where you access ClickVisual is not localhost.Then when you set the URL, you also need to change the root_url option of [app] in the configuration to the URL you filled in, so that the callback URL is correct.

Restarting the clickvisual service will make your configuration take effect.