export default {
  operation: "操作",
  add: "添加",
  search: "查询",
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
  "button.cancel": "关闭",
  spin: "加载中...",
  "table.column.filter.placeholder": "请输入查询条件",
  "table.column.filter.reset": "重置",
  "table.column.filter.refresh": "刷新",
  required: "必填",

  type: "类型",
  status: "状态",
  dingTalk: "钉钉",

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
  "navbar.upgrade.lodingText": "升级中",
  "navbar.upgrade.successText": "升级成功",
  "footer.copyright": `@2021~${new Date().getFullYear()} ClickVisual`,

  // menu
  "menu.configure": "配置",
  "menu.log": "日志",
  "menu.alarm": "报警",
  "menu.alarm.rules": "报警规则",
  "menu.alarm.notifications": "通知方式",
  "menu.systemSettings": "系统管理",
  "menu.systemSettings.database": "实例管理",
  "menu.systemSettings.cluster": "集群管理",
  "menu.systemSettings.events": "事件中心",
  "menu.systemSettings.pms": "权限管理",
  "menu.systemSettings.role": "角色管理",
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
  "instance.form.title.cluster": "集群",
  "instance.form.title.k8s": "K8s",
  "instance.form.title.ruleStoreType": "告警",
  "instance.form.title.ruleStoreType.tip": "报警中心的报警规则存储方式",
  "instance.form.title.ruleStoreType.radio.file": "文件",
  "instance.form.title.ruleStoreType.radio.enable": "关闭",
  "instance.form.title.filePath": "文件路径",
  "instance.form.placeholder.instanceName": "请输入实例名称",
  "instance.form.placeholder.datasource": "请选择数据源",
  "instance.form.placeholder.mode": "请选择类型",
  "instance.form.placeholder.clusterName": "请输入集群名称",
  "instance.form.placeholder.dsn": "请输入数据源连接串，例如：{example}",
  "instance.form.placeholder.filePath": "请输入文件路径",
  "instance.form.moreOptions": "更多设置",
  "instance.form.rule.dsn": "请输入数据源连接串",
  "instance.form.rule.configmap": "请选择 ConfigMap",
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
  "config.files.sync": "从 K8S 中 同步",
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
  "events.form.queryBtn": "查询",
  "events.list.noMore": "没有更多了",

  // Data Logs
  // Data Logs-Datasource
  "datasource.header.tip": "实例：{instance}，数据库：{database}",
  "datasource.header.databaseEmpty": "暂未选择数据库",
  "datasource.header.switch": "切换数据库",
  "datasource.logLibrary.search.placeholder": "搜索日志库",
  "datasource.logLibrary.search.created": "新增日志库",
  "datasource.deleted.content": "确认删除数据库：{database} 吗？",
  "datasource.deleted.loading": "正在删除数据库：{database}...",
  "datasource.deleted.success": "删除数据库：{database} 成功",

  "datasource.logLibrary.from.tableName": "数据表名称",
  "datasource.logLibrary.from.rule.tableName":
    "请输入小写字母、大写字母，或下划线",
  "datasource.logLibrary.from.type": "_time_ 字段类型",
  "datasource.logLibrary.from.days": "日志保存天数",
  "datasource.logLibrary.from.brokers": "Brokers",
  "datasource.logLibrary.from.topics": "Topics",
  "datasource.logLibrary.from.consumers": "Consumers",
  "datasource.logLibrary.from.rule.topics":
    "请输入数字、英文字母，中划线、下划线或 . ",
  "datasource.logLibrary.from.creationMode": "创建方式",

  "datasource.logLibrary.from.creationMode.option.newLogLibrary": "新建日志库",
  "datasource.logLibrary.from.creationMode.option.logLibrary": "接入日志库",
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
    "请输入数据表名称，支持小写字母、大写字母，或下划线",
  "datasource.logLibrary.placeholder.type": "请选择数据表类型",
  "datasource.logLibrary.placeholder.days": "请输入日志保存天数",
  "datasource.logLibrary.placeholder.brokers": "kafka:9092",
  "datasource.logLibrary.placeholder.topics":
    "请输入 Topics，支持数字、英文字母，或中划线",
  "datasource.logLibrary.placeholder.consumers": "请输入 Consumers",

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
  "datasource.draw.search": "搜索数据库",
  "datasource.draw.table.datasource": "数据库",
  "datasource.draw.table.instance": "实例",
  "datasource.draw.table.deployment": "部署方式",
  "datasource.draw.table.type": "数据库类型",
  "datasource.draw.table.empty.type.tip": "无数据库类型",
  "datasource.draw.table.operation.tip": "在此数据库下新增日志库",

  // Data Logs-Log Query Types MenuItem
  "log.queryType.menuItem.rawLog": "原始",
  "log.queryType.menuItem.statisticalTable": "表格",

  "log.share": "分享",
  "log.share.success": "URL 已粘贴至剪切板",
  "log.share.error": "分享 URL 出错啦，请尝试重新分享，或者刷新页面后操作",

  // Data Logs-Statistical Table
  "log.table.note":
    "注：当前请求默认限制返回 100 行，若要获取更多结果，请自行添加 limit 语句",

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
  "log.index.search.placeholder": "搜索字段",
  "log.index.empty": "暂未创建字段",
  "log.index.item.empty": "暂无数据",
  "log.index.manage": "字段管理（该功能在 _raw_log_ 字段格式为 JSON 时可用）",
  "log.index.help":
    "橙色背景色的字段是系统字段或用户字段，灰色背景色的字段是未设置字段，统计只对配置的字段生效",
  "log.index.manage.table.header.indexName": "字段名称",
  "log.index.manage.table.header.query": "开启查询",
  "log.index.manage.table.header.indexType": "字段类型",
  "log.index.manage.table.header.hashType": "hash索引",
  "log.index.manage.placeholder.indexName": "必填且不可重复，请输入字段名称",
  "log.index.manage.placeholder.alias": "请输入字段描述",
  "log.index.manage.enum.zero": "暂不支持该类型",
  "log.index.manage.button.deleted": "删除字段",
  "log.index.manage.button.created": "新增字段",
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
  "alarm.rules.form.title": "报警监控规则",
  "alarm.rules.form.alarmName": "报警名称",
  "alarm.rules.form.description": "报警描述",
  "alarm.rules.form.channelIds": "通知方式",
  "alarm.rules.form.placeholder.alarmName": "请输入报警名称",
  "alarm.rules.form.placeholder.description": "请输入报警描述",
  "alarm.rules.form.placeholder.channelIds": "请选择通知方式",
  "alarm.rules.form.rule.alarmName": "请输入小写字母、大写字母，或下划线",
  "alarm.rules.inspectionFrequency": "检查频率",
  "alarm.rules.form.inspectionStatistics": "检查统计",
  "alarm.rules.form.inspectionStatistics.error": "最少需要添加一条检查统计",
  "alarm.rules.form.triggerCondition": "触发条件",
  "alarm.rules.form.triggerCondition.error": "最少需要添加一条触发条件",
  "alarm.rules.form.preview": "预览",
  "alarm.rules.form.notPreview.content": "请先点击预览",
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
  "alarm.notify.modal.created": "新增通知方式",
  "alarm.notify.created.success": "新增通知方式成功",
  "alarm.notify.modal.updated": "更新通知方式",
  "alarm.notify.updated.success": "更新通知方式成功",
  "alarm.notify.modal.title": "删除通知方式",
  "alarm.notify.modal.content": "确定删除通知方式：{channelName} 吗？",
  "alarm.notify.deleted.loading": "正在删除通知方式 {channelName}...",
  "alarm.notify.deleted.success": "删除通知方式 {channelName} 成功",

  // install
  "install.init.text.databaseInit":
    "需要进行数据库初始化或结构升级，请点击下方安装按钮",

  "install.init.btn.databaseInit": "数据库初始化或结构升级",

  "install.init.model.databaseInit.successTitle": "初始化完成",
  "install.init.model.databaseInit.successContent":
    "数据库初始化完成，点击'确定'按钮跳转到登录页面",
  "install.init.model.databaseInit.successOkText": "确定",
};
