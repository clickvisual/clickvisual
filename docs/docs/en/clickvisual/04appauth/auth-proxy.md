# Auth Proxy

You can configure ClickVisual to let HTTP reverse proxy handle authentication, which makes it easy to embed clickvisual into other systems. Below we detail the configuration options for Auth Proxy.



HTTP Proxy Config：
```yaml
[auth.proxy]
# Defaults to false, but set to true to enable this feature
enabled = true
# HTTP Header name that will contain the username or email
headerName = "X-WEBAUTH-USER"
```

Use Curl to test Auth Proxy function：
```sh
curl -H "X-WEBAUTH-USER: admin"  http://localhost:19001/api/v1/users/info
```
Third party system use Auth Proxy to embed ClickVisual:

![img.png](../../../images/auth-proxy.png)image.png