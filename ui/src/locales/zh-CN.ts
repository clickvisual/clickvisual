export default {
  operation: "操作",
  create: "新建",
  add: "添加",
  search: "查询",
  edit: "编辑",
  delete: "删除",
  submit: "提交",
  name: "名称",
  description: "描述",
  DescAsAlias: "备注",
  loading: "正在加载",
  loadingDone: "加载成功",
  noData: "没有数据",
  fileName: "文件名",
  export: "导出",
  "error.title": "请求失败",
  "error.default": "未知错误, 请联系负责人",
  "error.content": "错误：{msg}",
  "error.copy": "复制错误信息",
  "button.save": "保存",
  "button.cancel": "取消",
  "button.ok": "确定",
  "button.test": "测试",
  spin: "加载中...",
  "table.column.filter.placeholder": "请输入查询条件",
  "table.column.filter.reset": "重置",
  "table.column.filter.refresh": "刷新",
  "input.placeholder": "请输入{name}",
  "select.placeholder": "请选择{name}",
  "create.name": "新建 {name}",
  required: "必填",
  tips: "提示",
  unit: "单位",
  time: "时间",

  type: "类型",
  capacity: "容量",
  shardNum: "分片数",
  replicaNum: "副本数",
  count: "总量",
  status: "状态",
  dingTalk: "钉钉",
  WeCom: "企业微信",
  Feishu: "飞书",
  Slack: "Slack",

  user: "用户",
  utime: "更新时间",

  "unit.second": "秒",
  "unit.minute": "分钟",
  "unit.hour": "小时",
  "unit.day": "天",
  "unit.week": "周",
  "unit.year": "年",

  "frequency.hour": "每小时",
  "frequency.day": "每天",
  "frequency.week": "每周",
  "frequency.ft": "固定时间",

  "week.mon": "周一",
  "week.tue": "周二",
  "week.wed": "周三",
  "week.thurs": "周四",
  "week.fri": "周五",
  "week.sat": "周六",
  "week.sun": "周日",

  "navbar.lang": "中文",
  "navbar.changePassword": "修改密码",
  "navbar.logOut": "退出登录",
  "navbar.upgrade": "数据库结构升级",
  "navbar.interfaceDoc": "接口文档",
  "navbar.upgrade.lodingText": "升级中",
  "navbar.upgrade.successText": "升级成功",
  "footer.copyright": `@2021~${new Date().getFullYear()} ClickVisual`,

  // menu
  "menu.configure": "配置",
  "menu.log": "日志",
  "menu.alarm": "报警",
  "menu.alarm.rules": "报警列表",
  "menu.alarm.notifications": "通知渠道",
  "menu.alarm.environment": "配置管理",
  "menu.systemSettings": "系统管理",
  "menu.systemSettings.database": "实例管理",
  "menu.systemSettings.cluster": "集群管理",
  "menu.systemSettings.events": "事件中心",
  "menu.systemSettings.pms": "权限管理",
  "menu.systemSettings.role": "角色管理",
  "menu.systemSettings.user": "用户管理",
  "menu.bigdata": "分析",
  "menu.bigdata.realtime": "实时业务",
  "menu.bigdata.temporaryQuery": "临时查询",

  // user
  "login.header": "欢迎来到 ClickVisual",
  "login.title": "登  录",
  "login.username": "账号",
  "login.username.placeholder": "请输入账号",
  "login.password": "密码",
  "login.password.placeholder": "请输入密码",
  "login.button": "登  录",
  "login.footer.divider": "或",
  "login.thirdParty.github": "使用 GitHub 登录",
  "login.thirdParty.gitlab": "使用 GitLab 登录",
  "login.message.success": "登录成功",
  "login.message.logOut": "退出登录成功",

  "password.title": "修改密码",
  "password.change.old": "原密码",
  "password.change.new": "新密码",
  "password.change.confirm": "确认密码",
  "password.placeholder.old": "请输入原密码",
  "password.placeholder.new": "请输入新密码",
  "password.placeholder.confirm": "请再次输入新密码",
  "password.rule.min": "密码长度过短，最少需要 5 位字符",
  "password.rule.match": "新密码必须匹配",
  "password.loading": "正在修改密码...",
  "password.success": "密码修改成功",

  // System Setting
  // Instance Management
  "instance.role.tip": "修改权限",
  "instance.button.add": "新增实例",
  "instance.instanceName": "实例名称",
  "instance.datasource": "数据源",
  "instance.storagePah": "存储路径",
  "instance.delete.confirmTip": "确认删除实例：{name} 吗？",
  "instance.form.title.created": "新增实例",
  "instance.form.title.edit": "编辑实例",
  "instance.form.title.mode": "类型",
  "instance.form.title.modeType.single": "单机",
  "instance.form.title.clusterWithDuplicate": "集群版（带副本）",
  "instance.form.title.replicaStatus": "是否包含副本",
  "instance.form.title.cluster": "集群",
  "instance.form.title.k8s": "K8s",
  "instance.form.title.ruleStoreType": "告警模块",
  "instance.form.title.ruleStoreType.tip": "报警中心的报警规则存储方式",
  "instance.form.title.ruleStoreType.radio.file": "文件",
  "instance.form.title.ruleStoreType.radio.off": "关闭",
  "instance.form.title.ruleStoreType.radio.on": "开启",
  "instance.form.title.filePath": "文件路径",
  "instance.form.placeholder.instanceName": "请输入实例名称",
  "instance.form.placeholder.datasource": "选择数据源",
  "instance.form.placeholder.orm": "字段映射",
  "instance.form.placeholder.schedule": "调度配置",
  "instance.form.placeholder.mode": "请选择类型",
  "instance.form.placeholder.clusterName": "请输入集群名称",
  "instance.form.placeholder.dsn": "请输入数据源连接串，例如：{example}",
  "instance.form.placeholder.filePath": "请输入文件路径",
  "instance.form.moreOptions": "更多设置",
  "instance.form.rule.dsn": "请输入数据源连接串",
  "instance.form.rule.configmap": "请选择 ConfigMap",
  "instance.form.test.warning": "请填写 DNS 后再进行测试",
  "instance.form.test.success": "测试成功",
  "instance.form.test.fail": "测试失败",
  "instance.form.test.tip": "请先进行连接测试后再提交表单",
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
  "cluster.clusterName": "集群名称",
  "cluster.k8sConfiguration": "Kubeconfig",
  "cluster.delete.confirmTip": "确认删集群：{clusterName} 吗？",
  "cluster.form.title.created": "新增集群",
  "cluster.form.title.edit": "编辑集群",
  "cluster.form.status": "集群状态",
  "cluster.form.status.normality": "正常",
  "cluster.form.status.anomaly": "异常",
  "cluster.form.placeholder.clusterName": "请输入集群名称",
  "cluster.form.placeholder.apiServer": "http://localhost:6443",
  "cluster.form.placeholder.k8sConfiguration": `apiVersion: v1
  kind: Config
  clusters:
  - cluster:
    name: development
  users:
  - name: developer
  contexts:
  - context:
    name: development`,
  "cluster.form.placeholder.description": "请输入集群的描述",
  "cluster.success.created": "新增集群成功",
  "cluster.success.updated": "更新集群成功",
  "cluster.success.deleted": "删除集群成功",

  // Configure
  "config.configmap.success.created": "新增 ConfigMap 成功",
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
  "config.files.sync": "从 K8S 中同步",
  "config.files.tooltip.onlineDiff": "线上版本比较",
  "config.files.confirm.deleted":
    "确定删除: {name}.{format} 吗？该操作也将删除集群 ConfigMap 中的相关配置文件,请谨慎操作",
  "config.files.button.create": "创建配置文件",

  // configure-menu-publish
  "config.publish.button": "发布",
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
  "config.selectedBar.configmap": "Namespace / ConfigMap",
  "config.selectedBar.button": "新增",
  "config.selectedBar.button.tooltip": "新增 Namespace 和 ConfigMap",
  "config.selectedBar.current":
    "当前选择的 Namespace 是：{namespace}，当前选择的 ConfigMap 是：{configmap}",

  // configure-modal-commit
  "config.commit.title": "保存配置变更",
  "config.commit.form.message": "变更记录",
  "config.commit.form.placeholder.message": "请描述一下本次变更修改了哪些内容",

  // configure-modal-createdConfig
  "config.createdConfig.title": "新增配置",
  "config.createdConfig.form.format": "格式",
  "config.createdConfig.form.fileName": "文件名",
  "config.createdConfig.form.placeholder.fileName": "请输入文件名",

  // configure-modal-createdConfigMap
  "config.createdConfigMap.title": "新增 ConfigMap，当前集群为：{cluster}",
  "config.createdConfigMap.placeholder.namespace": "请输入 Namespace",
  "config.createdConfigMap.placeholder.configmap": "请输入 ConfigMap",

  // configure-modal-history
  "config.history.table.user": "操作用户",
  "config.history.table.changeLog": "变更记录",
  "config.history.table.version": "版本号",
  "config.history.table.submitTime": "提交时间",
  "config.history.table.button.viewChanges": "查看变更",

  // configure-modal-history-diff
  "config.historyDiff.title": "历史版本比对",

  // events
  "events.input.placeholder": "请选择{value}",
  "events.list.noMore": "没有更多了",

  // Data Logs
  // Data Logs-Datasource
  "datasource.header.tip": "实例：{instance}，数据库：{database}",
  "datasource.header.databaseEmpty": "暂未选择数据库",
  "datasource.header.switch": "切换数据库",
  "datasource.logLibrary.search.placeholder": "搜索日志库",
  "datasource.logLibrary.search.created": "新增日志库",
  "datasource.logLibrary.noInstance": "暂无实例",
  "datasource.logLibrary.toCreate": "去创建",
  "datasource.deleted.content": "确认删除数据库：{database} 吗？",
  "datasource.deleted.loading": "正在删除数据库：{database}...",
  "datasource.deleted.success": "删除数据库：{database} 成功",

  "datasource.logLibrary.from.tableName": "数据表名称",
  "datasource.logLibrary.from.rule.tableName":
    "请输入小写字母、大写字母或下划线",
  "datasource.logLibrary.from.type": "时间字段类型",
  "datasource.logLibrary.from.timeField": "指定时间字段Key名称",
  "datasource.logLibrary.from.label.timeField": "时间字段",
  "datasource.logLibrary.from.rawLogField": "项目日志字段",
  "datasource.logLibrary.from.days": "日志保存天数",
  "datasource.logLibrary.from.brokers": "Brokers",
  "datasource.logLibrary.from.topics": "Topics",
  "datasource.logLibrary.from.consumers": "Consumers",
  "datasource.logLibrary.from.rule.topics":
    "请输入数字、英文字母，中划线、下划线或 . ",
  "datasource.logLibrary.from.creationMode": "创建方式",
  "datasource.logLibrary.from.souceTips": "source内容不符合要求，点击跳转文档",

  "datasource.logLibrary.from.creationMode.option.newLogLibrary": "新建日志库",
  "datasource.logLibrary.from.creationMode.option.logLibrary": "接入日志库",
  "datasource.logLibrary.from.creationMode.option.template":
    "模板库创建- {name}",
  "datasource.logLibrary.from.newLogLibrary.instance": "实例",
  "datasource.logLibrary.from.newLogLibrary.instance.defaultOption":
    "请选择实例",
  "datasource.logLibrary.from.newLogLibrary.timeResolutionField":
    "时间解析字段",
  "datasource.logLibrary.from.newLogLibrary.timeResolutionField.placeholder":
    "请输入时间解析字段",
  "datasource.logLibrary.from.newLogLibrary.timeFieldType": "时间字段类型",
  "datasource.logLibrary.from.newLogLibrary.rule.timeResolutionFieldType":
    "请选择时间戳类型",
  "datasource.logLibrary.from.newLogLibrary.timeType.seconds": "秒",
  "datasource.logLibrary.from.newLogLibrary.timeType.millisecond": "毫秒",
  "datasource.logLibrary.from.newLogLibrary.fieldsInTheTable": "分析字段",
  "datasource.logLibrary.from.newLogLibrary.desc.placeholder": "请输入描述",

  "datasource.logLibrary.placeholder.tableName":
    "请输入数据表名称，支持小写字母、大写字母或下划线",
  "datasource.logLibrary.isLinkLogLibrary": "是否链路日志库",
  "datasource.logLibrary.usingSystemTime": "使用系统时间",
  "datasource.logLibrary.placeholder.type": "请选择数据表类型",
  "datasource.logLibrary.placeholder.days": "请输入日志保存天数",
  "datasource.logLibrary.placeholder.brokers": "kafka:9092",
  "datasource.logLibrary.placeholder.topics":
    "请输入 Topics，支持数字、英文字母或中划线",
  "datasource.logLibrary.placeholder.consumers": "请输入 Consumers",
  "datasource.logLibrary.placeholder.source": "请输入 Source",
  "datasource.logLibrary.placeholder.rawLogField":
    "请输入 Source 并转换选择 RawLogField",
  "datasource.logLibrary.placeholder.timeField":
    "请输入 Source 并转换选择 TimeField",

  "datasource.logLibrary.conversionBtn": "转换",
  "datasource.logLibrary.documentBtn": "帮助文档",
  "datasource.logLibrary.conversion.warning": "请填写内容再转换",
  "datasource.logLibrary.selectField.title": "字段选择",
  "datasource.logLibrary.selectField.okTips":
    "请选择timeField字段和rawLogField字段再确认",

  "datasource.logLibrary.empty": "未查询到相关日志库列表",
  "datasource.logLibrary.quickAdd": "快速创建日志库",
  "datasource.tooltip.icon.info": "详情",
  "datasource.tooltip.icon.edit": "编辑",
  "datasource.tooltip.icon.alarmRuleList": "查看告警",
  "datasource.tooltip.icon.topology": "查看拓扑",
  "datasource.tooltip.icon.view": "配置时间字段",
  "datasource.tooltip.icon.link": "关联链路库",
  "datasource.tooltip.icon.linkDependency": "查看 FDG",
  "datasource.tooltip.icon.deleted": "删除",
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
  "datasource.draw.search": "搜索数据库",
  "datasource.draw.logLibraryButton": "接入已有日志库",
  "datasource.draw.table.datasource": "数据库",
  "datasource.draw.table.datasourceDesc": "数据库备注",
  "datasource.draw.table.instance": "实例",
  "datasource.draw.table.instanceDesc": "实例备注",
  "datasource.draw.table.deployment": "部署方式",
  "datasource.draw.table.type": "数据库类型",
  "datasource.draw.table.empty.type.tip": "无数据库类型",
  "datasource.draw.table.operation.tip": "新增日志库",
  "datasource.draw.table.delete.tip": "删除数据库",
  "datasource.draw.table.edit.tip": "编辑数据库",

  "log.share": "分享",
  "log.share.success": "短链接生成成功，有效期30天",
  "log.share.error": "分享 URL 出错啦，请尝试重新分享或者刷新页面后操作",

  "log.filter.edit.title": "编辑 filter",
  "log.filter.add.title": "新增 filter",
  "log.filter.form.field": "字段",
  "log.filter.form.field.placeholder": "首先选择一个字段",
  "log.filter.form.operator": "操作符",
  "log.filter.form.operator.placeholder": "请选择操作符",
  "log.filter.form.value": "值",
  "log.filter.form.value.placeholder": "输入值",
  "log.filter.form.isCustom": "创建自定义标签?",
  "log.filter.form.custom": "自定义标签",

  "log.filter.menu.global": "设置为全局filter",
  "log.filter.menu.unpin": "取消全局filter",
  "log.filter.menu.enable": "重新启用",
  "log.filter.menu.disable": "暂时禁用",

  "log.collectHistory.tooltip": "收藏记录",
  "log.collectHistory.placeholder": "请输入内容再收藏~",
  "log.collectHistory.modal.title": "收藏历史记录",
  "log.collectHistory.modal.alias": "别名",
  "log.collectHistory.modal.alias.placeholder": "请输入别名",

  // log nva
  "log.switch.histogram": "直方图",
  "log.switch.unfold": "折叠日志",
  "log.switch.folding": "折叠",
  "log.switch.link": "链路",
  "log.switch.unknown": "未知",

  // log link
  "log.link.tips.description": "需要具体的链路id，_key='链路ID'",
  "log.link.tips.formatNotCompliant": "链路日志格式不合规",

  // Data Logs-Statistical Table
  "log.table.note": "搜索(注：谨慎操作)",

  // Data Logs-Raw Logs
  "log.empty.logLibrary": "请选择需要查询的日志库",
  "log.search.placeholder": "请输入查询语句",
  "log.search.codeHinting.historyQuery": "历史查询",
  "log.search.codeHinting.analysisField": "分析字段",
  "log.search.codeHinting.keyword": "关键字",
  "log.search.codeHinting.collectHistory": "收藏历史",
  "log.search.codeHinting.value": "当前值",
  "log.search.icon.quickSearch": "增加查询条件",
  "log.search.help.content.specifyField":
    "指定字段查询：Method='Get' and _raw_log_ like '%error%'",
  "log.search.help.content.directionsUse": "使用说明",
  "log.search.help.content.directionsUse.url":
    "https://clickvisual.gocn.vip/clickvisual/03funcintro/instructions.html",
  "log.search.quickSearch.column.placeholder": "请选择 column",
  "log.search.quickSearch.operator.placeholder": "请选择 operator",
  "log.search.quickSearch.value.placeholder": "请输入 value",
  "log.search.quickSearch.fill": "填充",

  "log.index.header.title": "分析",
  "log.index.search.placeholder": "搜索字段",
  "log.index.empty": "暂未创建字段",
  "log.index.item.empty": "暂无数据",
  "log.index.manage": "字段管理",
  "log.index.manage.desc": "字段管理",
  "log.index.help":
    "橙色背景色的字段是系统字段或用户字段，灰色背景色的字段是未设置字段，统计只对配置的字段生效",
  "log.index.manage.table.header.indexName": "字段名称",
  "log.index.manage.table.header.query": "开启查询",
  "log.index.manage.table.header.indexType": "字段类型",
  "log.index.manage.table.header.hashType": "hash索引",
  "log.index.manage.placeholder.indexName": "必填且不可重复，请输入字段名称",
  "log.index.manage.placeholder.alias": "请输入字段描述",
  "log.index.manage.enum.zero": "未设置",
  "log.index.manage.button.deleted": "删除字段",
  "log.index.manage.button.created": "新增字段",
  "log.index.manage.message.save.success": "保存成功",

  "log.highChart.tooltip.startTime": "开始时间：",
  "log.highChart.tooltip.endTime": "结束时间：",
  "log.highChart.tooltip.num": "次数：",
  "log.highChart.tooltip.prompt": "点击查询精确结果",

  "log.empty": "暂未查询到日志",
  "log.pagination.total": "日志总条数: {total}",
  "log.item.copy": "复制",
  "log.item.copyRowLog": "复制项目日志",
  "log.item.copy.success": "复制成功",
  "log.item.copy.failed": "复制失败，请手动复制",
  "log.item.moreTag": "查看更多日志信息",
  "log.perform.time": "执行耗时",

  // JsonView
  "log.JsonView.unfoldTip": "请先展开再点击~",

  // ClickMenu
  "log.ClickMenu.addCondition": "添加查询条件",
  "log.ClickMenu.excludeCondition": "排除查询条件",
  "log.ClickMenu.viewLink": "查看链路",
  "log.ClickMenu.copyValues": "复制值",

  // dataLogs -> DataSourceMenu -> LogLibraryList-> EditLogLibraryModal
  "log.editLogLibraryModal.modifySuc": "修改成功",
  "log.editLogLibraryModal.label.tabName": "日志库名称",
  "log.editLogLibraryModal.label.createType": "创建类型",
  "log.editLogLibraryModal.label.desc.placeholder": "请输入备注",
  "log.editLogLibraryModal.label.isCreateCV.name": "是否由ClickVisual创建",

  // dataLogs -> DataSourceMenu -> LogLibraryList-> AssociatLogLibraries
  "log.associatLogLibraries.storageId": "当前日志库",
  "log.associatLogLibraries.traceTableId": "链路日志库",

  // dataLogs -> SelectedDatabaseDraw -> EditDatabaseModel
  "log.editDatabaseModel.title": "编辑数据库",
  "log.editDatabaseModel.label.datasourceType": "数据源类型",

  // DateTimeSelectedCard
  "dateTime.relative": "相对",
  "dateTime.custom": "自定义",
  "dateTime.option.minutes": "{num} 分钟",
  "dateTime.option.hours": "{num} 小时",
  "dateTime.option.days": "{num} 天",
  "dateTime.option.weeks": "{num} 周",
  "dateTime.option.months": "{num} 月",
  "dateTime.option.years": "{num} 年",

  // Alarm
  // Rules
  "alarm.rules.selected.placeholder.database": "请选择数据库",
  "alarm.rules.selected.placeholder.logLibrary": "请选择日志库",
  "alarm.rules.selected.placeholder.status": "请选择报警状态",
  "alarm.rules.button.created": "新增报警",
  "alarm.rules.table.alarmName": "报警名称",
  "alarm.rules.table.logLibrary": "关联日志库",
  "alarm.rules.form.title": "报警监控规则",
  "alarm.rules.form.alarmName": "报警名称",
  "alarm.rules.form.serviceName": "服务名称",
  "alarm.rules.form.mobiles": "报警人手机号",
  "alarm.rules.form.level": "报警级别",
  "alarm.rules.form.level.alarm": "告警",
  "alarm.rules.form.level.notice": "通知",
  "alarm.rules.form.level.serious": "严重",
  "alarm.rules.form.description": "报警描述",
  "alarm.rules.form.channelIds": "通知渠道",
  "alarm.rules.form.placeholder.alarmName": "请输入报警名称",
  "alarm.rules.form.placeholder.serviceName": "请输入服务名称",
  "alarm.rules.form.placeholder.mobiles": "请输入报警人手机号，多个以逗号分隔",
  "alarm.rules.form.placeholder.alarmId": "请输入报警Id",
  "alarm.rules.form.placeholder.level": "请选择报警级别",
  "alarm.rules.form.placeholder.description": "请输入报警描述",
  "alarm.rules.form.placeholder.channelIds": "请选择通知渠道",
  "alarm.rules.form.rule.alarmName": "请输入小写字母、大写字母或下划线",
  "alarm.rules.inspectionFrequency": "检查频率",
  "alarm.rules.form.inspectionStatistics": "检查统计",
  "alarm.rules.form.associatedTable": "关联的数据表",
  "alarm.rules.form.addTable": "新增关联的表",
  "alarm.rules.form.inspectionStatistics.error": "最少需要关联一个表",
  "alarm.rules.form.triggerCondition": "触发条件",
  "alarm.rules.form.triggerCondition.error": "最少需要添加一条触发条件",
  "alarm.rules.form.noDataOp": "空数据处理策略",
  "alarm.rules.form.preview": "预览",
  "alarm.rules.form.aggregatedData": "聚合数据",
  "alarm.rules.form.aggregatedIndicators": "聚合指标",
  "alarm.rules.form.preview.aggregatedData": "预览聚合数据",
  "alarm.rules.form.preview.aggregatedIndicators": "预览聚合指标",
  "alarm.rules.form.preview.unknownState": "未知状态",
  "alarm.rules.form.preview.canConfirm": "可确认",
  "alarm.rules.form.notPreview.content": "请先完成所有预览",
  "alarm.rules.form.mode": "告警模式",
  "alarm.rules.form.level.instructions": "使用帮助",
  "alarm.rules.form.mode.normalMode": "普通模式",
  "alarm.rules.form.mode.aggregationMode": "聚合模式",
  "alarm.rules.inspectionFrequency.selectOption.logLibrary": "日志库",
  "alarm.rules.inspectionFrequency.between": "查询区间",
  "alarm.rules.inspectionFrequency.database": "数据库",
  "alarm.rules.inspectionFrequency.placeholder.database": "请选择数据库",
  "alarm.rules.inspectionFrequency.database.Option":
    "实例：{instance}，数据库：{database}",
  "alarm.rules.inspectionFrequency.logLibrary": "数据表",
  "alarm.rules.inspectionFrequency.placeholder.logLibrary": "请选择数据表",
  "alarm.rules.creator": "创建人",
  "alarm.rules.switch.open": "重新开始",
  "alarm.rules.switch.close": "暂停",
  "alarm.rules.open.loading": "正在开启报警：{alarmName}...",
  "alarm.rules.open.success": "开启报警：{alarmName} 成功",
  "alarm.rules.close.loading": "正在关闭报警：{alarmName}...",
  "alarm.rules.close.success": "关闭报警：{alarmName} 成功",

  "alarm.rules.info.title": "报警详情",
  "alarm.rules.info.view": "视图",
  "alarm.rules.info.rule": "规则",
  "alarm.rules.materializedViews": "物化视图: ",

  "alarm.rules.created": "新增报警成功",
  "alarm.rules.updated": "更新报警成功",
  "alarm.rules.deleted": "删除报警成功",
  "alarm.rules.deleted.loading": "正在删除报警...",
  "alarm.rules.deleted.content": "确定删除报警：{alarm} 吗？",

  "alarm.rules.history.column.isPushed": "是否成功推送报警",
  "alarm.rules.history.column.ctime": "触发时间",
  "alarm.rules.history.isPushed.true": "是",
  "alarm.rules.history.isPushed.false": "否",
  "alarm.rules.history.title.total": "总报警数",
  "alarm.rules.history.title.sucPublish": "成功推送次数",

  "alarm.rules.state.alerting": "正在报警",
  "alarm.rules.state.ok": "正常",
  "alarm.rules.state.paused": "暂停",
  "alarm.rules.state.config": "配置中",

  "alarm.rules.historyBorad.theLog": "日志",
  "alarm.rules.historyBorad.toView": "查看日志详情",
  "alarm.rules.historyBorad.ctime": "创建时间",
  "alarm.rules.historyBorad.lastUpdateTime": "上次更新时间",
  "alarm.rules.historyBorad.checkFrequency": "检查频率",
  "alarm.rules.historyBorad.status": "状态",
  "alarm.rules.historyBorad.clickOnTheCopy": "点击复制",
  "alarm.rules.historyBorad.user": "用户",
  "alarm.rules.historyBorad.table": "表格",
  "alarm.rules.historyBorad.database": "数据库",
  "alarm.rules.historyBorad.instance": "实例",
  "alarm.rules.historyBorad.successPushRate": "成功推送率",
  "alarm.rules.historyBorad.basicInformation": "基础信息",
  "alarm.rules.historyBorad.historicalAlarmStatistics": "告警历史统计",

  // Notifications
  "alarm.notify.button.created": "新增渠道",
  "alarm.notify.modal.created": "新增通知渠道",
  "alarm.notify.created.success": "新增通知渠道成功",
  "alarm.notify.sendTest.success": "发送测试通知成功,请到客户端进行验证",
  "alarm.notify.modal.updated": "更新通知渠道",
  "alarm.notify.updated.success": "更新通知渠道成功",
  "alarm.notify.modal.title": "删除通知渠道",
  "alarm.notify.modal.content": "确定删除通知渠道：{channelName} 吗？",
  "alarm.notify.deleted.loading": "正在删除通知渠道 {channelName}...",
  "alarm.notify.deleted.success": "删除通知渠道 {channelName} 成功",
  "alarm.notify.name.placeholder": "请输入通知名称",
  "alarm.notify.type.placeholder": "请选择通知渠道",
  "alarm.notify.url.placeholder": "请输入通知url",

  // alarm -> environment
  "alarm.environment.RuleStoreType.notOpen": "未开启",
  "alarm.environment.form.notOpen": "不开启",
  "alarm.environment.RuleStoreType.file": "文件",
  "alarm.environment.form.title": "编辑告警环境",
  "alarm.environment.form.ruleStoreType": "告警类型",
  "alarm.environment.form.isPrometheusOK": "Prometheus 检测",
  "alarm.environment.form.isAlertManagerOK": "AlertManager 检测",
  "alarm.environment.form.isMetricsSamplesOk": "metrics.samples 检测",

  // install
  "install.init.text.databaseInit":
    "需要进行数据库初始化或结构升级，请点击下方安装按钮",

  "install.init.btn.databaseInit": "数据库初始化或结构升级",

  "install.init.model.databaseInit.successTitle": "初始化完成",
  "install.init.model.databaseInit.successContent":
    "数据库初始化完成，点击'确定'按钮跳转到登录页面",

  // sys -> instance -> roleAssign
  "systemSetting.instancePanel.roleAssign.modelTitle.name": "实例",
  "systemSetting.instancePanel.roleAssign.modelTitle.roleAuth": "角色授权",
  "systemSetting.instancePanel.roleAssign.modelLabel.role": "角色",
  "systemSetting.instancePanel.roleAssign.modelBottom.createCustomRoleBtn":
    "新建自定义角色",
  "systemSetting.instancePanel.roleAssign.loadingText": "保存中...",
  "systemSetting.instancePanel.roleAssign.loadingSucText": "保存成功",

  "systemSetting.instancePanel.roleAssign.rolesList.collapseItem.authorization":
    "授权",

  "systemSetting.instancePanel.roleAssign.rolesList.grantList.scope": "作用域",
  "systemSetting.instancePanel.roleAssign.rolesList.grantList.scope.placeholder":
    "请选择授权域名",
  "systemSetting.instancePanel.roleAssign.rolesList.grantList.user": "用户",
  "systemSetting.instancePanel.roleAssign.rolesList.grantList.user.placeholder":
    "请选择授权用户",
  "systemSetting.instancePanel.roleAssign.rolesList.grantList.createAuthorization":
    "新增授权",

  "systemSetting.instancePanel.roleAssign.roleModel.instance": "实例",
  "systemSetting.instancePanel.roleAssign.roleModel.editModel.title":
    "更新操作",
  "systemSetting.instancePanel.roleAssign.roleModel.editModel.content":
    "您确定要更新角色内容吗？",
  "systemSetting.instancePanel.roleAssign.roleModel.custom": "自定义",
  "systemSetting.instancePanel.roleAssign.roleModel.role": "角色",
  "systemSetting.instancePanel.roleAssign.roleModel.resources": "所属资源",
  "systemSetting.instancePanel.roleAssign.roleModel.resources.placeholder":
    "请选择所属资源",
  "systemSetting.instancePanel.roleAssign.roleModel.EnglishName": "角色英文名",
  "systemSetting.instancePanel.roleAssign.roleModel.EnglishName.placeholder":
    "请输入角色英文名",
  "systemSetting.instancePanel.roleAssign.roleModel.roleDescription":
    "角色描述",
  "systemSetting.instancePanel.roleAssign.roleModel.roleDescription.placeholder":
    "请输入角色描述",

  "systemSetting.instancePanel.roleAssign.roleModel.detailList.errorText":
    "请增加资源授权",
  "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.subresource":
    "子资源",
  "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.subresource.placeholder":
    "请选择子资源",
  "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.allow":
    "准许操作",
  "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.allow.placeholder":
    "请选择准许操作",
  "systemSetting.instancePanel.roleAssign.roleModel.detailList.create":
    "新增资源授权",

  // sys -> instance -> roleAssign -> RolesList -> CollapseItem -> CollapseTitle
  "systemSetting.instancePanel.roleAssign.rolesList.CollapseTitle":
    "角色权限 ( [子资源]: [准许操作] )",

  "systemSetting.instancePanel.roleAssign.editModel.title": "更新操作",
  "systemSetting.instancePanel.roleAssign.editModel.content":
    "您确定要更新角色内容吗？",

  // sys -> role
  "systemSetting.role.delete.success": "删除成功",
  "systemSetting.role.delete.title": "删除操作",
  "systemSetting.role.delete.content": "您确定要删除角色: {name}吗？",
  "systemSetting.role.table.name": "角色名",
  "systemSetting.role.table.desc": "角色描述",
  "systemSetting.role.table.belongResource": "所属资源",
  "systemSetting.role.table.subResources": "子资源",
  "systemSetting.role.table.acts": "准许",
  "systemSetting.role.filtrate.label.belongResource": "所属资源",
  "systemSetting.role.filtrate.label.name": "角色名",
  "systemSetting.role.filtrate.clear": "清空条件",
  "systemSetting.role.filtrate.rootAuthority": "root授权",
  "systemSetting.role.filtrate.createDefaultRole": "创建默认角色",
  "systemSetting.role.filtrate.superAdministratorAuthorization":
    "超级管理员授权",

  // sys -> role -> CollapseX
  "systemSetting.role.collapseX.unfold": "展开",
  "systemSetting.role.collapseX.packUp": "收起",

  // sys -> role -> ItemForm
  "systemSetting.role.itemForm.form.label.belongResource": "所属资源",
  "systemSetting.role.itemForm.form.belongResource.placeholder":
    "请选择所属类型",
  "systemSetting.role.itemForm.form.belongResource.instance": "实例",
  "systemSetting.role.itemForm.form.label.roleName": "角色英文名",
  "systemSetting.role.itemForm.form.roleName.rules": "请输入角色英文名",
  "systemSetting.role.itemForm.form.mandatory": "必填",
  "systemSetting.role.itemForm.form.label.description": "角色描述",
  "systemSetting.role.itemForm.form.description.rules": "请输入角色描述信息",
  "systemSetting.role.itemForm.form.label.sub_resources": "子资源",
  "systemSetting.role.itemForm.form.sub_resources.rules": "请选择子资源",
  "systemSetting.role.itemForm.form.label.acts": "准许操作",
  "systemSetting.role.itemForm.form.acts.rules": "请选择授权操作",

  // sys -> role -> RootUserForm
  "systemSetting.role.rootUserForm.superAdministrator": "超级管理员",
  "systemSetting.role.rootUserForm.superAdministrator.rules":
    "请至少选择一个用户!",

  // sys -> role-> hooks -> role
  "hooks.role.create.ing": "正在添加",
  "hooks.role.create.failure": "创建失败",
  "hooks.role.create.success": "添加成功",
  "hooks.role.create.failure.tips": "角色创建失败请重试！",
  "hooks.role.authorization.ing": "正在授权...",
  "hooks.role.authorization.failure": "授权失败",
  "hooks.role.authorization.success": "授权成功",
  "hooks.role.authorization.failure.tips": "授权失败请重试！",

  // sys -> user
  "sys.user.allCopy": "一键复制",
  "sys.user.resetSuccess": "重置成功",
  "sys.user.resetPassword": "重置密码",
  "sys.user.resetTip": "确定重置用户「{user}」的密码吗？",
  "sys.user.createUser": "创建用户",
  "sys.user.username": "登录账号",
  "sys.user.nickname": "显示用户名",
  "sys.user.deleteName": "删除用户",
  "sys.user.deleteNameTips": "确定删除用户「{user}」吗？",
  "sys.user.deleteName.success": "删除用户成功",

  // models -> pms
  "models.pms.creating": "创建中...",
  "models.pms.create.suc": "创建成功",
  "models.pms.updating": "更新中...",
  "models.pms.update.suc": "更新成功",
  "models.pms.permissions.failureText": "获取权限相关基础信息失败",

  // bigdata realtime
  "bigdata.realtime.table": "表",
  "bigdata.realtime.database": "库",
  "bigdata.realtime.buildTableSQL": "建表SQL",

  // bigdata workflow
  "bigdata.workflow.header.title": "业务流程",

  "bigdata.workflow.rightMenu.add": "新建业务流程",
  "bigdata.workflow.rightMenu.update": "编辑业务流程",
  "bigdata.workflow.rightMenu.delete": "删除业务流程",

  "bigdata.workflow.form.name": "业务流程",
  "bigdata.workflow.form.name.placeholder": "请输入业务流程名称",
  "bigdata.workflow.add.success": "创建业务流程成功",
  "bigdata.workflow.update.success": "更新业务流程成功",
  "bigdata.workflow.delete.content": "确认业务流程：{workflow} 吗？",
  "bigdata.workflow.delete.loading": "删除业务流程中...",
  "bigdata.workflow.delete.success": "删除业务流程成功",

  "bigdata.workflow.dataIntegration": "数据集成",
  "bigdata.workflow.dataDevelopment": "数据开发",
  "bigdata.workflow.board": "看板",

  // bigdata DataSourceManage
  "bigdata.dataSourceManage.searchBar.dataSourceType.placeholder":
    "请选择数据源类型",
  "bigdata.dataSourceManage.searchBar.dataSourceType.create": "新增数据源",

  "bigdata.dataSourceManage.dataTable.dataSourceName": "数据源名称",
  "bigdata.dataSourceManage.dataTable.linkInformation": "连接信息",
  "bigdata.dataSourceManage.dataTable.dataSourceDesc": "数据源描述",
  "bigdata.dataSourceManage.dataTable.deleteDataSourceTips":
    "确认删除数据源「{dataSource}」吗",

  "bigdata.dataSourceManage.create.typ": "种类",
  "bigdata.dataSourceManage.create.userName": "用户名",

  // bigdata components
  "bigdata.components.SQLEditor.selectFile": "请选择文件",

  "bigdata.components.RightMenu.properties": "调度配置",
  "bigdata.components.RightMenu.versions": "版本",
  "bigdata.components.RightMenu.Versions.tips": "历史版本",
  "bigdata.components.RightMenu.results.title": "运行历史",
  "bigdata.components.RightMenu.results": "结果",
  "bigdata.components.RightMenu.results.tips": "运行结果",
  "bigdata.components.RightMenu.notResults": "暂无运行结果",
  "bigdata.components.RightMenu.results.executionTime": "执行时间",
  "bigdata.components.RightMenu.results.ExecutionDuration": "执行时长",
  "bigdata.components.RightMenu.results.timingTask": "定时任务",
  "bigdata.components.RightMenu.results.notResultsId": "未找到结果id",

  "bigdata.components.RightMenu.VersionHistory.submitter": "提交人",
  "bigdata.components.RightMenu.VersionHistory.SubmitTime": "提交时间",
  "bigdata.components.RightMenu.VersionHistory.details": "详情",
  "bigdata.components.RightMenu.VersionHistory.drawer.title": "版本历史",
  "bigdata.components.RightMenu.VersionHistory.childDrawer.title": "查询语句",

  "bigdata.components.RightMenu.Scheduling.Modify": "修改",
  "bigdata.components.RightMenu.Scheduling.secondary.all": "任意",
  "bigdata.components.RightMenu.Scheduling.secondary.dataIntegration":
    "数据集成",
  "bigdata.components.RightMenu.Scheduling.secondary.dataMining": "数据开发",
  "bigdata.components.RightMenu.Scheduling.secondary.board": "看板",
  "bigdata.components.RightMenu.Scheduling.secondary.universal": "通用节点",
  "bigdata.components.RightMenu.Scheduling.name": "名称",
  "bigdata.components.RightMenu.Scheduling.nodeType": "节点类型",
  "bigdata.components.RightMenu.Scheduling.basicConfig": "基础配置",
  "bigdata.components.RightMenu.Scheduling.isPerform": "是否执行",
  "bigdata.components.RightMenu.Scheduling.channelIds": "失败告警",
  "bigdata.components.RightMenu.Scheduling.thoseResponsible": "责任人",
  "bigdata.components.RightMenu.Scheduling.cronTips":
    "调度规则 cron 字段填写 帮助文档",

  "bigdata.components.RightMenu.Scheduling.Schedule": "时间属性",
  "bigdata.components.RightMenu.Scheduling.autoRerun": "出错自动重跑",
  "bigdata.components.RightMenu.Scheduling.rerunsNumber": "重跑次数",
  "bigdata.components.RightMenu.Scheduling.rerunInterval": "重跑间隔",

  "bigdata.components.RightMenu.Scheduling.Parameter.title": "参数",
  "bigdata.components.RightMenu.Scheduling.Parameter.newButton": "新增参数",
  "bigdata.components.RightMenu.Scheduling.Parameter.key.placeholder":
    "请输入参数名",
  "bigdata.components.RightMenu.Scheduling.Parameter.val.placeholder":
    "请为参数赋值",

  "bigdata.components.Results.involvedSQLs.key.placeholder": "请选择查看",

  "bigdata.components.Nav.navList.dataSourceManage": "数据源管理",
  "bigdata.components.Nav.navList.statisticalBoard": "统计看板",
  "bigdata.components.Nav.navList.taskExecutionDetails": "任务执行详情",

  "bigdata.components.FolderTree.createFolderPrompt":
    "暂时只支持新建2级文件夹~",
  "bigdata.components.FolderTree.iconList.createNode": "新建节点",
  "bigdata.components.FolderTree.iconList.createFolder": "新建文件夹",
  "bigdata.components.FolderTree.folderName": "文件名称",

  "bigdata.components.FolderTree.FolderTitle.node": "节点",
  "bigdata.components.FolderTree.FolderTitle.folder": "文件夹",
  "bigdata.components.FolderTree.FolderTitle.deleteTips": "确认删除吗?类型：",

  "bigdata.components.FolderTree.crateNode.createTitle": "新建临时查询",
  "bigdata.components.FolderTree.crateNode.updateTitle": "修改临时查询",
  "bigdata.components.FolderTree.crateNode.tertiarySelect.placeholder":
    "请选择数据源类型",
  "bigdata.components.FolderTree.crateNode.sourceSelect.placeholder":
    "请选择数据源",
  "bigdata.components.FolderTree.crateNode.nodeName.placeholder":
    "请输入临时查询脚本名称",
  "bigdata.components.FolderTree.crateNode.nodeDesc.placeholder":
    "请输入临时查询脚本描述",

  "bigdata.components.FolderTree.crateFolder.createTitle": "新建文件夹",
  "bigdata.components.FolderTree.crateFolder.updateTitle": "修改文件夹",
  "bigdata.components.FolderTree.crateFolder.secondary.placeholder":
    "请选择secondary",

  "bigdata.components.FileTitle.fileType.realtime": "实时同步",
  "bigdata.components.FileTitle.fileType.offline": "离线同步",
  "bigdata.components.FileTitle.fileType.default": "未知文件",
  "bigdata.components.FileTitle.NodeStatus.pending": "等待定时任务",
  "bigdata.components.FileTitle.NodeStatus.inProgress": "执行中",
  "bigdata.components.FileTitle.NodeStatus.ExecutionException": "执行异常",
  "bigdata.components.FileTitle.NodeStatus.ExecuteComplete": "执行完成",
  "bigdata.components.FileTitle.NodeStatus.PendingRun": "待执行",
  "bigdata.components.FileTitle.user.invalidUser": "无效用户",
  "bigdata.components.FileTitle.user.editing": "正在编辑",
  "bigdata.components.FileTitle.user.readOnly": "只读",
  "bigdata.components.FileTitle.startEditing": "开始编辑",
  "bigdata.components.FileTitle.exitEditor": "退出编辑",
  "bigdata.components.FileTitle.grabTheLock": "抢锁",
  "bigdata.components.FileTitle.grabLockSuccessful": "抢锁成功",
  "bigdata.components.FileTitle.formatting": "格式化",
  "bigdata.components.FileTitle.run": "运行",
  "bigdata.components.sqlSaveTips": "获取编辑权限后可以保存",

  "bigdata.models.dataAnalysis.runLoadingText": "运行中",
  "bigdata.models.dataAnalysis.runLoadingDoneText": "运行成功",
  "bigdata.models.dataAnalysis.unlockTips": "当前修改暂未保存，确定要解锁吗",

  "bigdata.models.dataAnalysis.useManageNodeAndFolder.stopping": "停止中",
  "bigdata.models.dataAnalysis.useManageNodeAndFolder.stopSuccess": "停止成功",
  "bigdata.models.dataAnalysis.useManageNodeAndFolder.saveBoardNodesTips":
    "必须存在且仅存在一组开始和结束节点",
  "bigdata.models.dataAnalysis.useManageNodeAndFolder.all": "全部",
  "bigdata.models.dataAnalysis.useManageNodeAndFolder.start": "输入节点",
  "bigdata.models.dataAnalysis.useManageNodeAndFolder.end": "输出节点",

  // dataAnalysis -> StatisticalBoard
  "bigdata.dataAnalysis.statisticalBoard.Screening.yesterday": "昨天",
  "bigdata.dataAnalysis.statisticalBoard.Screening.beforeYesterday": "前天",
  "bigdata.dataAnalysis.statisticalBoard.Screening.nearlyWeek": "近七天",
  "bigdata.dataAnalysis.statisticalBoard.Screening.inCharge": "我负责的",

  "bigdata.dataAnalysis.statisticalBoard.Screening.failureInstance": "失败任务",
  "bigdata.dataAnalysis.statisticalBoard.Screening.successfulInstance":
    "成功任务",
  "bigdata.dataAnalysis.statisticalBoard.Screening.unknownInstance": "未知任务",
  "bigdata.dataAnalysis.statisticalBoard.Screening.failureNode": "失败节点",
  "bigdata.dataAnalysis.statisticalBoard.Screening.successfulNode": "成功节点",
  "bigdata.dataAnalysis.statisticalBoard.Screening.unknownNode": "未知节点",

  "bigdata.dataAnalysis.statisticalBoard.DashboardTop.title": "重点关注",
  "bigdata.dataAnalysis.statisticalBoard.RunningStatus.title": "运行状态分布",
  "bigdata.dataAnalysis.statisticalBoard.CompletionTask.title": "任务完成情况",

  // dataAnalysis -> TaskExecutionDetails
  "bigdata.dataAnalysis.taskExecutionDetails.column.status.name": "执行状态",
  "bigdata.dataAnalysis.taskExecutionDetails.column.status.successful":
    "执行成功",
  "bigdata.dataAnalysis.taskExecutionDetails.column.status.failure": "执行失败",
  "bigdata.dataAnalysis.taskExecutionDetails.column.tertiary.name": "任务类型",
  "bigdata.dataAnalysis.taskExecutionDetails.column.crontab.name": "定时时间",
  "bigdata.dataAnalysis.taskExecutionDetails.column.cost.name": "运行时长",
  "bigdata.dataAnalysis.taskExecutionDetails.column.startTime.name": "开始时间",
  "bigdata.dataAnalysis.taskExecutionDetails.column.endTime.name": "结束时间",

  "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.nodeSearch": "节点搜索",
  "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.nodeName": "节点名称",
  "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.businessDate":
    "业务日期",
  "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.nodeType": "节点类型",
  "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.nodeType.placeholder":
    "请选择节点类型",

  "pandas.analysis.data.source": "数据来源",
  "pandas.analysis.data.filter": "数据过滤",
  "pandas.analysis.data.filter.placeholder":
    "请参考相应的 SQL 语法填写过滤条件",
  "pandas.analysis.data.target": "数据去向",
  "pandas.analysis.data.target.before": "导入前语句",
  "pandas.analysis.data.target.before.placeholder":
    "请参考相应的 SQL 语法填写导入数据前执行的 SQL 脚本",
  "pandas.analysis.data.target.after": "导入后语句",
  "pandas.analysis.data.target.after.placeholder":
    "请参考相应的 SQL 语法填写导入数据后执行的 SQL 脚本",
};
