# How to contribute

## 准备

- Go >= 1.17
- React >= 17.0.0

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