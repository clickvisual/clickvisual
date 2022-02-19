export default {
  operation: "操作",
  edit: "编辑",
  delete: "删除",
  submit: "提交",
  description: "描述",
  loading: "正在加载",
  loadingDone: "加载成功",
  "error.title": "请求失败",
  "error.default": "未知错误, 请联系负责人",
  "error.content": "错误：{msg}",
  "error.copy": "复制错误信息",
  "button.save": "保存",
  "button.search": "查询",
  spin: "加载中...",
  "table.column.filter.placeholder": "请输入查询条件",
  "table.column.filter.reset": "重置",

  "navbar.lang": "中文",
  "navbar.logOut": "退出登录",
  "footer.copyright": `@ 2021 ~ ${new Date().getFullYear()} 武汉初心科技有限公司（石墨文档）`,

  // menu
  "menu.configure": "配置",
  "menu.log": "日志",
  "menu.systemSettings": "系统设置",
  "menu.systemSettings.database": "实例管理",
  "menu.systemSettings.cluster": "集群管理",

  // user
  "login.header": "欢迎来到 MOGO",
  "login.title": "登  录",
  "login.username": "用户名",
  "login.username.placeholder": "请输入用户名",
  "login.password": "密码",
  "login.password.placeholder": "请输入密码",
  "login.button": "登  录",
  "login.footer.divider": "或",
  "login.thirdParty.github": "使用 GitHub 登录",
  "login.thirdParty.gitlab": "使用 GitLab 登录",
  "login.message.success": "登录成功",
  "login.message.logOut": "退出登录成功",

  // System Setting
  // Instance Management
  "instance.button.add": "新增实例",
  "instance.instanceName": "实例名称",
  "instance.datasource": "数据源",
  "instance.delete.confirmTip": "确认删除实例：{instanceName} 吗？",
  "instance.form.title.created": "新增实例",
  "instance.form.title.edit": "编辑实例",
  "instance.form.placeholder.instanceName": "请输入实例名称",
  "instance.form.placeholder.datasource": "请选择数据源",
  "instance.form.placeholder.dsn": "请输入数据源连接串，例如：{example}",
  "instance.operation.addDatabase": "新增数据库",
  "instance.success.created": "新增实例成功",
  "instance.success.updated": "更新实例成功",
  "instance.success.deleted": "删除实例成功",

  // Database Management
  "database.form.title": "新增数据库",
  "database.form.label.name": "数据库名称",
  "database.form.placeholder.name": "请输入数据库名称",
  "database.form.reg.name": "仅支持_、小写字母或数字，且以字母开头",
  "database.success.created": "新增数据库成功",

  // Cluster Management
  "cluster.button.add": "新增集群",
  "cluster.clusterName": "实例名称",
  "cluster.k8sConfiguration": "k8s 配置",
  "cluster.delete.confirmTip": "确认删集群：{clusterName} 吗？",
  "cluster.form.title.created": "新增集群",
  "cluster.form.title.edit": "编辑集群",
  "cluster.form.status": "集群状态",
  "cluster.form.status.normality": "正常",
  "cluster.form.status.anomaly": "异常",
  "cluster.form.placeholder.clusterName": "请输入集群名称",
  "cluster.form.placeholder.apiServer": "http://localhost:6443",
  "cluster.form.placeholder.k8sConfiguration": "请输入集群的 k8s 配置",
  "cluster.form.placeholder.description": "请输入集群的描述",
  "cluster.success.created": "新增集群成功",
  "cluster.success.updated": "更新集群成功",
  "cluster.success.deleted": "删除集群成功",

  // Configure
  "config.configMap.success.created": "新增 ConfigMap 成功",
  "config.file.success.created": "新增配置成功",
  "config.file.success.updated": "保存配置成功",
  "config.file.success.deleted": "删除配置成功",
  "config.file.success.publish": "发布配置成功",
  "config.file.success.sync": "同步配置成功",
  "config.file.loading.sync": "同步配置中...",

  // configure-editor
  "config.editor.userEditing": " 正在编辑",
  "config.editor.exitEditor": "退出编辑",
  "config.editor.exitEditor.confirm":
    "当前修改未保存，退出后将丢失本次修改的内容，是否退出编辑？",
  "config.editor.button.startEdit": "开始编辑",
  "config.editor.empty.tip": "请选择一个配置文件",

  // configure-menu-files
  "config.diff.title": "实时配置比对",
  "config.diff.online": "生效中配置",
  "config.diff.current": "本次发布配置",
  "config.files.history": "提交历史记录",
  "config.files.select.empty.tip": "请选择一个 ConfigMap",
  "config.files.empty.tip": "暂无配置文件",
  "config.files.tooltip.created": "新增配置",
  "config.files.sync": "从 K8S 中 同步",
  "config.files.tooltip.onlineDiff": "线上版本比较",
  "config.files.confirm.deleted":
    "确定删除: {name}.{format} 吗？该操作也将删除集群 ConfigMap 中的相关配置文件,请谨慎操作",
  "config.files.button.create": "创建配置文件",

  // configure-menu-publish
  "config.diff.button": "发布",
  "config.publish.confirm.title": "确认发布",
  "config.publish.confirm.content": "配置即将发布到集群",
  "config.publish.form.placeholder.configure": "请选择配置文件",
  "config.publish.form.placeholder.version": "选择一个版本",
  "config.publish.versionInfo.title": "版本信息",
  "config.publish.versionInfo.time": "变更时间",
  "config.publish.button.emptyFile": "请选择一个配置文件",
  "config.publish.button.emptyVersion": "请选择一个版本",

  // configure-menu-menuBar
  "config.menuBar.files": "配置编辑",
  "config.menuBar.publish": "版本发布",

  // configure-selectedBar
  "config.selectedBar.cluster": "请选择集群",
  "config.selectedBar.configMap": "Namespace / ConfigMap",
  "config.selectedBar.button": "新增",
  "config.selectedBar.button.tooltip": "新增 Namespace 和 ConfigMap",
  "config.selectedBar.current":
    "当前选择的 Namespace 是：{namespace}，当前选择的 ConfigMap 是：{configMap}",

  // configure-modal-commit
  "config.commit.title": "保存配置变更",
  "config.commit.form.message": "变更记录",
  "config.commit.form.placeholder.message": "请描述一下本次变更修改了哪些内容",

  // configure-modal-createdConfig
  "config.createdConfig.title": "新建配置",
  "config.createdConfig.form.format": "格式",
  "config.createdConfig.form.fileName": "文件名",
  "config.createdConfig.form.placeholder.fileName": "请输入文件名",

  // configure-modal-createdConfigMap
  "config.createdConfigMap.title": "新增 ConfigMap，当前集群为：{cluster}",
  "config.createdConfigMap.placeholder.namespace": "请输入 Namespace",
  "config.createdConfigMap.placeholder.configMap": "请输入 ConfigMap",

  // configure-modal-history
  "config.history.table.user": "操作用户",
  "config.history.table.changeLog": "变更记录",
  "config.history.table.version": "版本号",
  "config.history.table.submitTime": "提交时间",
  "config.history.table.button.viewChanges": "查看变更",

  // configure-modal-history-diff
  "config.historyDiff.title": "历史版本比对",

  // Data Logs
  // Data Logs-Datasource
  "datasource.header.databaseEmpty": "暂未选择数据库",
  "datasource.header.switch": "切换数据库",
  "datasource.logLibrary.search.placeholder": "搜索日志库",
  "datasource.logLibrary.search.created": "新增日志库",

  "datasource.logLibrary.from.tableName": "数据表名称",
  "datasource.logLibrary.from.rule.tableName":
    "请输入小写字母、大写字母，或下划线",
  "datasource.logLibrary.from.type": "_time_ 字段类型",
  "datasource.logLibrary.from.days": "日志保存天数",
  "datasource.logLibrary.from.brokers": "Brokers",
  "datasource.logLibrary.from.topics": "Topics",
  "datasource.logLibrary.from.rule.topics":
    "请输入小写字母、大写字母，或中划线",

  "datasource.logLibrary.placeholder.tableName":
    "请输入数据表名称，支持小写字母、大写字母，或下划线",
  "datasource.logLibrary.placeholder.type": "请选择数据表类型",
  "datasource.logLibrary.placeholder.days": "请输入日志保存天数",
  "datasource.logLibrary.placeholder.brokers": "127.0.0.1:9091",
  "datasource.logLibrary.placeholder.topics":
    "请输入 Topics，支持小写字母、大写字母，或中划线",

  "datasource.logLibrary.empty": "未查询到相关日志库列表",
  "datasource.logLibrary.quickAdd": "快速创建日志库",
  "datasource.tooltip.icon.info": "日志库详情",
  "datasource.tooltip.icon.view": "配置数据采集规则",
  "datasource.tooltip.icon.deleted": "删除日志库",
  "datasource.view.draw": "日志采集规则管理",
  "datasource.view.button": "新增配置规则",
  "datasource.view.table.viewName": "规则名称",

  "datasource.logLibrary.info.sql": "SQL 配置",
  "datasource.logLibrary.info.placeholder.sql": "请选择要查看的 SQL 配置",

  "datasource.logLibrary.created.success": "新增数据表成功",
  "datasource.logLibrary.deleted.loading": "正在删除日志库：{logLibrary}",
  "datasource.logLibrary.deleted.content": "确定删除日志库：{logLibrary} 吗？",
  "datasource.logLibrary.deleted.success": "删除日志库成功",

  "datasource.logLibrary.views.modal.created": "新增数据采集规则",
  "datasource.logLibrary.views.modal.edit": "编辑数据采集规则",
  "datasource.logLibrary.views.form.viewName": "规则名称",
  "datasource.logLibrary.views.form.isUseDefaultTime": "是否使用系统时间",
  "datasource.logLibrary.views.form.timeKey": "关键字",
  "datasource.logLibrary.views.form.timeFormat": "时间格式",
  "datasource.logLibrary.views.selectName.timeFormat.unix": "Unix 时间戳",

  "datasource.logLibrary.views.placeholder.viewName": "请输入规则名称",
  "datasource.logLibrary.views.placeholder.timeKey": "请输入指定时间关键字",
  "datasource.logLibrary.views.placeholder.timeFormat": "请选择时间格式",

  "datasource.logLibrary.views.success.created": "新增采集规则成功",
  "datasource.logLibrary.views.success.updated": "更新采集规则成功",
  "datasource.logLibrary.views.success.deleted": "删除采集规则成功",
  "datasource.logLibrary.views.deleted.content": "确定删除规则：{rule} 吗？",

  // Data Logs-Datasource-Draw
  "datasource.draw.title": "数据库列表",
  "datasource.draw.selected": "请选择实例",
  "datasource.draw.table.datasource": "数据库",
  "datasource.draw.table.instance": "实例",
  "datasource.draw.table.type": "数据库类型",
  "datasource.draw.table.empty.type.tip": "无数据库类型",

  // Data Logs-Raw Logs
  "log.empty.logLibrary": "请选择需要查询的日志库",
  "log.search.placeholder": "请输入查询语句",
  "log.search.icon.quickSearch": "增加查询条件",
  "log.search.help.title.inquire": "查询：",
  "log.search.help.content.specifyField":
    "指定字段查询：Method='Get' and _raw_log_ like '%error%'",
  "log.search.quickSearch.column.placeholder": "请选择 column",
  "log.search.quickSearch.operator.placeholder": "请选择 operator",
  "log.search.quickSearch.value.placeholder": "请输入 value",

  "log.index.header.title": "分析",
  "log.index.search.placeholder": "搜索索引",
  "log.index.empty": "暂未创建索引",
  "log.index.item.empty": "暂无数据",
  "log.index.manage": "索引管理（该功能在 _raw_log_ 字段格式为 JSON 时可用）",
  "log.index.help":
    "橙色背景色的字段是系统字段或索引字段，灰色背景色的字段是未设置索引的字段，索引统计只对设置索引后的数据生效",
  "log.index.manage.table.header.indexName": "索引名称",
  "log.index.manage.table.header.query": "开启查询",
  "log.index.manage.table.header.indexType": "索引类型",
  "log.index.manage.placeholder.indexName": "必填且不可重复，请输入索引名称",
  "log.index.manage.placeholder.alias": "请输入索引描述",
  "log.index.manage.button.deleted": "删除索引",
  "log.index.manage.button.created": "新增索引",
  "log.index.manage.message.save.success": "保存成功",

  "log.highChart.tooltip.startTime": "开始时间：",
  "log.highChart.tooltip.endTime": "结束时间：",
  "log.highChart.tooltip.num": "次数：",
  "log.highChart.tooltip.prompt": "点击查询精确结果",

  "log.empty": "暂未查询到日志",
  "log.pagination.total": "日志总条数：{total}",
  "log.item.copy": "复制",
  "log.item.copy.success": "复制成功",
  "log.item.copy.failed": "复制失败，请手动复制",
  "log.item.moreTag": "查看更多日志信息",

  // DateTimeSelectedCard
  "dateTime.relative": "相对",
  "dateTime.custom": "自定义",
  "dateTime.option.minutes": "{num} 分钟",
  "dateTime.option.hours": "{num} 小时",
  "dateTime.option.days": "{num} 天",
  "dateTime.option.months": "{num} 月",
  "dateTime.option.years": "{num} 年",
};
