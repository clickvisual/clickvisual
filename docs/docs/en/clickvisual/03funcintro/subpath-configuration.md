# Subpath Config

`version >= 0.2.2`

You need change two Configuration item: Import environment variables and recompile the front-end; Update the backend service starts configuration.

For example,if you want to support this subpath:http://localhost:19001/clickvisual/

1. Import environment variables and recompile the front-end.Execute the command in the project root directory 

> make build.ui build.dist

> export PUBLIC_PATH=/clickvisual/

2. Compile the back-end

> make build.api

After the above two steps are successfully completed, the compiled binary file will be obtained in the folder ./bin, and the front-end file has been packaged into the binary file.



Modify service startup configuration：
- serveFromSubPath  true
- rootURL (subpath configuration)

``` 
[app]
serveFromSubPath = true
rootURL = "http://localhost:19001/clickvisual/"
```
The directory structure is shown in the following figure,execute the command to start:
>./bin/clickvisual server --config=./config/default.toml

![img.png](../../../images/config-tree.png)
