# How to contribute

## 准备

- Go >= 1.17
- React >= 17.0.0


##  Clone 代码
一般我们推荐将origin设置为官方的仓库，而设置一个自己的upstream。

如果已经在github上开启了SSH，那么我们推荐使用SSH，否则使用HTTPS。两者之间的区别在于，使用HTTPS每次推代码到远程库的时候，都需要输入身份验证信息。
而我们强烈建议，官方库永远使用HTTPS，这样可以避免一些误操作。

```bash
git clone https://github.com/shimohq/mogo.git
cd mogo
git remote add upstream 'git@github.com:<your github username>/mogo.git'
```

### 设置 Api 开发环境

Mogo api 使用 Go 进行开发，如果你本地尚未安装 Go 环境，可以参考[这里](https://go.dev/learn/)安装。

### 设置 UI 开发环境 

Mogo ui 使用 Ant Design 构建，你可以参考这里 [Ant Design](https://ant.design/) 来配置本地开发环境和熟悉前端组件。

### 数据迁移

你可以去 [migration](./scripts/migration/) 目录下执行相应的 SQL 将表同步到 DB 中。

## 启动

### 启动 api 服务

- 修改配置文件
修改 `api/config/default.toml` 中对应配置，比如 `mysql.default` 等。

- 启动 api 服务
```bash
go run api/main -config api/config/default.toml 
```

### 启动 ui 服务

```bash
# 第一次运行前需要执行 yarn install
yarn run dev
```

## 代码风格

- [Go: CodeReviewComments](https://github.com/golang/go/wiki/CodeReviewComments)
- [React: Standardjs](https://standardjs.com/)