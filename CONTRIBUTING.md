# How to contribute

## 准备

- Go >= 1.17
- React >= 17.0.0


## Fork 代码
1. 访问 https://github.com/shimohq/mogo
2. 点击 "Fork" 按钮 (位于页面的右上方)

## Clone 代码
一般我们推荐将origin设置为官方的仓库，而设置一个自己的upstream。

如果已经在github上开启了SSH，那么我们推荐使用SSH，否则使用HTTPS。两者之间的区别在于，使用HTTPS每次推代码到远程库的时候，都需要输入身份验证信息。
而我们强烈建议，官方库永远使用HTTPS，这样可以避免一些误操作。

```bash
git clone https://github.com/shimohq/mogo.git
cd mogo
git remote add upstream 'git@github.com:<your github username>/mogo.git' 
```
upstream可以替换为任何你喜欢的名字。比如说你的用户名，你的昵称，或者直接使用me。后面的命令也要执行相应的替换。

## 同步代码
除非刚刚把代码拉到本地，否则我们需要先同步一下远程仓库的代码。
git fetch

在不指定远程库的时候，这个指令只会同步origin的代码。如果我们需要同步自己fork出来的，可以加上远程库名字：
git fetch upstream

## 创建 feature 分支
我们在创建新的 feature 分支的时候，要先考虑清楚，从哪个分支切出来。
我们假设，现在我们希望添加的特性将会被合并到master分支，或者说我们的新特性要在master的基础上进行，执行：
```bash
git checkout -b feature/my-feature origin/master
```
这样我们就切出来一个分支了。该分支的代码和origin/master上的完全一致。

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