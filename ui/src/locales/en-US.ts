export default {
  operation: "Operation",
  create: "Create",
  add: "Add",
  search: "Search",
  edit: "Edit",
  delete: "Delete",
  submit: "Submit",
  name: "Name",
  description: "Description",
  DescAsAlias: "Alias",
  loading: "loading",
  loadingDone: "Loading successful",
  noData: "no data",
  fileName: "file name",
  export: "export",
  "error.title": "Request Failed",
  "error.default": "Unknown error, please contact responsible",
  "error.content": "Error: {msg}",
  "error.copy": "Copy error message",
  "button.save": "Save",
  "button.cancel": "Cancel",
  "button.ok": "OK",
  "button.test": "Test",
  spin: "loading...",
  "table.column.filter.placeholder": "Please input conditions",
  "table.column.filter.reset": "Reset",
  "table.column.filter.refresh": "Refresh",
  "input.placeholder": "Please enter the {name}",
  "select.placeholder": "Please select a {name}",
  "create.name": "Create {name}",
  required: "Required",
  tips: "Tips",
  unit: "Unit",
  time: "Time",

  type: "Type",
  capacity: "Capacity",
  shardNum: "Shard",
  replicaNum: "Replica",
  count: "Count",
  status: "Status",
  dingTalk: "DingTalk",
  WeCom: "WeCom",
  Feishu: "Lark",
  Slack: "Slack",

  user: "User",
  utime: "Update Time",

  "unit.second": "seconds",
  "unit.minute": "minutes",
  "unit.hour": "hours",
  "unit.day": "days",
  "unit.week": "weeks",
  "unit.year": "years",

  "frequency.hour": "Per Hour",
  "frequency.day": "Pre Day",
  "frequency.week": "Pre Week",
  "frequency.ft": "FT",

  "week.mon": "Mon.",
  "week.tue": "Tues.",
  "week.wed": "Wed.",
  "week.thurs": "Thurs.",
  "week.fri": "Fir.",
  "week.sat": "Sat.",
  "week.sun": "Sun.",

  "navbar.lang": "English",
  "navbar.changePassword": "Change password",
  "navbar.logOut": "Log out",
  "navbar.upgrade": "Database Structure Upgrade",
  "navbar.interfaceDoc": "Interface documentation",
  "navbar.upgrade.lodingText": "In the upgrade",
  "navbar.upgrade.successText": "Upgrade success",
  "footer.copyright": `@2021~${new Date().getFullYear()} by ClickVisual`,

  // menu
  "menu.configure": "Config",
  "menu.log": "Logs",
  "menu.alarm": "Alarm",
  "menu.alarm.rules": "Alarm list",
  "menu.alarm.notifications": "Notification Channel",
  "menu.alarm.environment": "Configuration anagement",
  "menu.systemSettings": "Setting",
  "menu.systemSettings.database": "Instances",
  "menu.systemSettings.cluster": "Cluster",
  "menu.systemSettings.events": "Event Center",
  "menu.systemSettings.pms": "Authority Management",
  "menu.systemSettings.role": "Role Management",
  "menu.systemSettings.user": "User management",
  "menu.bigdata": "Data Analysis",
  "menu.bigdata.realtime": "Real-time Industry",
  "menu.bigdata.temporaryQuery": "Temporary Query",

  // user
  "login.header": "Welcome to ClickVisual",
  "login.title": "Log In",
  "login.username": "username",
  "login.username.placeholder": "Please enter username",
  "login.password": "password",
  "login.password.placeholder": "Please enter password",
  "login.button": "Login",
  "login.footer.divider": "or",
  "login.thirdParty.github": "Sign in with GitHub",
  "login.thirdParty.gitlab": "Sign in with  GitLab",
  "login.message.success": "Login successful",
  "login.message.logOut": "Log Out successfully",

  "password.title": "Change Password",
  "password.change.old": "Old Password",
  "password.change.new": "New Password",
  "password.change.confirm": "Confirm Password",
  "password.placeholder.old": "Please enter your old password",
  "password.placeholder.new": "Please enter a new password",
  "password.placeholder.confirm": "Please enter the new password again",
  "password.rule.min": "Password length is short, at least 5 characters",
  "password.rule.match": "New password must match",
  "password.loading": "Changing password...",
  "password.success": "Password changed successfully",

  // System Setting
  // Instance Management
  "instance.role.tip": "Modify the permissions",
  "instance.button.add": "Add instance",
  "instance.instanceName": "Instance Name",
  "instance.datasource": "Datasource",
  "instance.storagePah": "Storage Path",
  "instance.delete.confirmTip": "Confirm deleting instance: {name} ?",
  "instance.form.title.created": "Create Instance",
  "instance.form.title.edit": "Edit Instance",
  "instance.form.title.mode": "Type",
  "instance.form.title.clusterWithDuplicate": "Cluster(With Duplicate)",
  "instance.form.title.replicaStatus": "Whether replica is included",
  "instance.form.title.cluster": "Cluster",
  "instance.form.title.k8s": "K8s",
  "instance.form.title.ruleStoreType": "Alarm",
  "instance.form.title.ruleStoreType.tip":
    "The storage method of the alarm rules of the alarm center",
  "instance.form.title.ruleStoreType.radio.file": "File",
  "instance.form.title.ruleStoreType.radio.off": "Close",
  "instance.form.title.ruleStoreType.radio.on": "Open",
  "instance.form.title.filePath": "File Path",
  "instance.form.placeholder.instanceName": "Please enter an instance name",
  "instance.form.placeholder.datasource": "Select datasource",
  "instance.form.placeholder.orm": "Field mapping",
  "instance.form.placeholder.schedule": "Scheduling",
  "instance.form.placeholder.mode": "Please select a type",
  "instance.form.placeholder.clusterName": "Please enter a cluster name",
  "instance.form.placeholder.dsn": "Please enter DSN, for example: {example}",
  "instance.form.placeholder.filePath": "Please enter the file path",
  "instance.form.moreOptions": "More Options",
  "instance.form.rule.dsn": "Please enter DSN",
  "instance.form.rule.configmap": "Please select ConfigMap",
  "instance.form.test.warning": "Please enter DNS and test again",
  "instance.form.test.success": "Test success",
  "instance.form.test.fail": "Test to fail",
  "instance.form.test.tip":
    "Please test the connection before submitting the form",
  "instance.operation.addDatabase": "Adding a database",
  "instance.success.created": "Created instance succeeded",
  "instance.success.updated": "Updated instance succeeded",
  "instance.success.deleted": "Deleted instance succeeded",

  // Database Management
  "database.form.title": "Create Database",
  "database.form.label.name": "Database Name",
  "database.form.placeholder.name": "Please enter a database name",
  "database.form.reg.name":
    "Support only _, lowercase letters or Numbers, and begin with a letter",
  "database.success.created": "Created database succeeded",

  // Cluster Management
  "cluster.button.add": "Add cluster",
  "cluster.clusterName": "Cluster Name",
  "cluster.k8sConfiguration": "Kubeconfig",
  "cluster.delete.confirmTip": "Confirm deleting cluster: {clusterName}?",
  "cluster.form.title.created": "Create Cluster",
  "cluster.form.title.edit": "Edit Cluster",
  "cluster.form.status": "Cluster Status",
  "cluster.form.status.normality": "Normality",
  "cluster.form.status.anomaly": "Anomaly",
  "cluster.form.placeholder.clusterName": "Please enter a cluster name",
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
  "cluster.form.placeholder.description":
    "Please enter a description of the cluster",
  "cluster.success.created": "Created cluster succeeded",
  "cluster.success.updated": "Updated cluster succeeded",
  "cluster.success.deleted": "Deleted cluster succeeded",

  // Configure
  "config.configmap.success.created": "Creating ConfigMap succeeded",
  "config.file.success.created": "Creating configuration succeeded",
  "config.file.success.updated": "Saving the configuration succeeded",
  "config.file.success.deleted": "Deleting the configuration succeeded",
  "config.file.success.publish": "Publishing the configuration succeeded",
  "config.file.success.sync": "Synchronization configuration success",
  "config.file.loading.sync": "Synchronizing configuration...",

  // configure-editor
  "config.editor.userEditing": " Editing",
  "config.editor.exitEditor": "Exit edit",
  "config.editor.exitEditor.confirm":
    "Current changes not saved, exit will be lost after the modifications, exit the editor?",
  "config.editor.button.startEdit": "Start editing",
  "config.editor.empty.tip": "Please select a configuration file",

  // configure-menu-files
  "config.diff.title": "Real-time configuration comparison",
  "config.diff.online": "Effect of the configuration",
  "config.diff.current": "This release configuration",
  "config.files.history": "Submit history",
  "config.files.select.empty.tip": "Please select a configmap",
  "config.files.empty.tip": "No configuration file",
  "config.files.sync": "Sync from K8S",
  "config.files.tooltip.created": "Create a configuration",
  "config.files.tooltip.onlineDiff": "Online version comparison",
  "config.files.confirm.deleted":
    "Are you sure to delete: {name}.{format}? This operation will also delete configuration files in the configmap cluster. Perform this operation with caution",
  "config.files.button.create": "Creating a configuration",

  // configure-menu-publish
  "config.publish.button": "Publish",
  "config.publish.confirm.title": "Confirm publication",
  "config.publish.confirm.content":
    "Configuration is about to be published to the cluster",
  "config.publish.form.placeholder.configure":
    "Please select a configuration file",
  "config.publish.form.placeholder.version": "Select a version",
  "config.publish.versionInfo.title": "Version Information",
  "config.publish.versionInfo.time": "Change time",
  "config.publish.button.emptyFile": "Please select a configuration file",
  "config.publish.button.emptyVersion": "Please select a version",

  // configure-menu-menuBar
  "config.menuBar.files": "Configuration Editor",
  "config.menuBar.publish": "Version Release",

  // configure-selectedBar
  "config.selectedBar.cluster": "Please select cluster",
  "config.selectedBar.configmap": "Namespace / ConfigMap",
  "config.selectedBar.button": "Create",
  "config.selectedBar.button.tooltip": "Create a Namespace and ConfigMap",
  "config.selectedBar.current":
    "The selected Namespace is {namespace} and the selected ConfigMap is {configmap}",

  // configure-modal-commit
  "config.commit.title": "Save Configuration Changes",
  "config.commit.form.message": "Change Record",
  "config.commit.form.placeholder.message":
    "Please describe what has been modified in this change",

  // configure-modal-create-config
  "config.createdConfig.title": "Creating a Configuration",
  "config.createdConfig.form.format": "Format",
  "config.createdConfig.form.fileName": "Filename",
  "config.createdConfig.form.placeholder.fileName":
    "Please enter the file name",

  // configure-modal-createdConfigMap
  "config.createdConfigMap.title": "Create ConfigMap In {cluster}",
  "config.createdConfigMap.placeholder.namespace": "Please enter Namespace",
  "config.createdConfigMap.placeholder.configmap": "Please enter ConfigMap",

  // configure-modal-history
  "config.history.table.user": "Operating User",
  "config.history.table.changeLog": "Change Record",
  "config.history.table.version": "Version Number",
  "config.history.table.submitTime": "Submission Time",
  "config.history.table.button.viewChanges": "View Changes",

  // configure-modal-history-diff
  "config.historyDiff.title": "Historical Version Comparison",

  // events
  "events.input.placeholder": "Please select a {value}",
  "events.list.noMore": "No more",

  // Data Logs
  // Data Logs-Datasource
  "datasource.header.tip": "Instance: {instance}, Database: {database}",
  "datasource.header.databaseEmpty": "DB Is Unselected",
  "datasource.header.switch": "Switch Database",
  "datasource.logLibrary.search.placeholder": "Search log library",
  "datasource.logLibrary.search.created": "Creating a Log library",
  "datasource.logLibrary.noInstance": "No instance",
  "datasource.logLibrary.toCreate": "To create",
  "datasource.deleted.content": "Confirm deleting database: {database}?",
  "datasource.deleted.loading": "Deleting a database: {database}...",
  "datasource.deleted.success": "Delete database: {database} succeeded",

  "datasource.logLibrary.from.tableName": "Table Name",
  "datasource.logLibrary.from.rule.tableName":
    "Please enter lowercase letters, uppercase letters, or underscores",
  "datasource.logLibrary.from.type": "_time_ Field Type",
  "datasource.logLibrary.from.timeField": "Specify the time field Key name",
  "datasource.logLibrary.from.label.timeField": "time field",
  "datasource.logLibrary.from.rawLogField": "rawLog field",
  "datasource.logLibrary.from.days": "Log Retention Days",
  "datasource.logLibrary.from.brokers": "Brokers",
  "datasource.logLibrary.from.topics": "Topics",
  "datasource.logLibrary.from.consumers": "Consumers",
  "datasource.logLibrary.from.rule.topics":
    "Please enter numbers/letters/hyphens/underline",
  "datasource.logLibrary.from.creationMode": "Creation Mode",
  "datasource.logLibrary.from.souceTips":
    "Souce does not meet the requirements, click Go to Document",

  "datasource.logLibrary.from.creationMode.option.newLogLibrary":
    "Create a log library",
  "datasource.logLibrary.from.creationMode.option.logLibrary":
    "Select an existing log library",
  "datasource.logLibrary.from.creationMode.option.template":
    "Template library Creation- {name}",
  "datasource.logLibrary.from.newLogLibrary.instance": "instance",
  "datasource.logLibrary.from.newLogLibrary.instance.defaultOption":
    "Please select an instance",
  "datasource.logLibrary.from.newLogLibrary.timeResolutionField":
    "Time Resolution Field",
  "datasource.logLibrary.from.newLogLibrary.timeResolutionField.placeholder":
    "Please enter the time resolution field",
  "datasource.logLibrary.from.newLogLibrary.rule.timeResolutionFieldType":
    "Please enter the time resolution field Type",
  "datasource.logLibrary.from.newLogLibrary.timeFieldType":
    "Time Resolution Field Type",
  "datasource.logLibrary.from.newLogLibrary.fieldsInTheTable": "Analysis Field",
  "datasource.logLibrary.from.newLogLibrary.timeType.seconds": "seconds",
  "datasource.logLibrary.from.newLogLibrary.timeType.millisecond":
    "millisecond",
  "datasource.logLibrary.from.newLogLibrary.desc.placeholder":
    "Please enter a description",

  "datasource.logLibrary.placeholder.tableName":
    "Please enter the name of the data table in upper or lower case English or underscore",
  "datasource.logLibrary.isLinkLogLibrary": "Whether the link log library",
  "datasource.logLibrary.usingSystemTime": "Using system time",
  "datasource.logLibrary.placeholder.type": "Please select a table type",
  "datasource.logLibrary.placeholder.days": "Please enter the log to save days",
  "datasource.logLibrary.placeholder.brokers": "kafka:9092",
  "datasource.logLibrary.placeholder.topics":
    "Please type Topics with numbers, letters, or hyphens",
  "datasource.logLibrary.placeholder.consumers": "Please enter Consumers",
  "datasource.logLibrary.placeholder.source": "Please enter Source",
  "datasource.logLibrary.placeholder.rawLogField":
    "Enter Source and convert to select RawLogField",
  "datasource.logLibrary.placeholder.timeField":
    "Enter Source and convert to select TimeField",
  "datasource.logLibrary.conversionBtn": "Conversion",
  "datasource.logLibrary.documentBtn": "Help document",
  "datasource.logLibrary.conversion.warning":
    "Please fill in the content and then convert",
  "datasource.logLibrary.selectField.title": "Field selection",
  "datasource.logLibrary.selectField.okTips":
    "Select the timeField and rawLogField fields to confirm",

  "datasource.logLibrary.empty":
    "Not query to the relevant logging library list",
  "datasource.logLibrary.quickAdd": "Create log library",
  "datasource.tooltip.icon.info": "Log Library Details",
  "datasource.tooltip.icon.edit": "Edit log library",
  "datasource.tooltip.icon.alarmRuleList": "Viewing Related Alarms",
  "datasource.tooltip.icon.topology": "View the corresponding topology",
  "datasource.tooltip.icon.view": "Configure data acquisition rules",
  "datasource.tooltip.icon.link": "Associate the link log library",
  "datasource.tooltip.icon.linkDependency": "View the FDG",
  "datasource.tooltip.icon.deleted": "Deleting a Log Library",
  "datasource.view.draw": "Manage Log Collection Rules",
  "datasource.view.button": "Creating a Configuration Rule",
  "datasource.view.table.viewName": "Rule Name",

  "datasource.logLibrary.info.sql": "SQL configuration",
  "datasource.logLibrary.info.placeholder.sql":
    "Please select to view the SQL configuration",

  "datasource.logLibrary.created.success": "The table is created successfully.",
  "datasource.logLibrary.deleted.loading": "Deleting logLibrary: {logLibrary}",
  "datasource.logLibrary.deleted.content":
    "Are you sure to delete logLibrary: {logLibrary}?",
  "datasource.logLibrary.deleted.success":
    "Deleting the log library succeeded. ",

  "datasource.logLibrary.views.modal.created": "Create a Data Collection Rule",
  "datasource.logLibrary.views.modal.edit": "Edit a Data Collection Rule",
  "datasource.logLibrary.views.form.viewName": "Rule Name",
  "datasource.logLibrary.views.form.isUseDefaultTime": "Use System Time",
  "datasource.logLibrary.views.form.timeKey": "Keyword",
  "datasource.logLibrary.views.form.timeFormat": "Time Format",
  "datasource.logLibrary.views.selectName.timeFormat.unix": "Unix timestamp",

  "datasource.logLibrary.views.placeholder.viewName":
    "Please enter a rule name",
  "datasource.logLibrary.views.placeholder.timeKey":
    "Please enter the specified time keyword",
  "datasource.logLibrary.views.placeholder.timeFormat":
    "Please select a time format",

  "datasource.logLibrary.views.success.created":
    "Create a collection rules for success",
  "datasource.logLibrary.views.success.updated":
    "Update the acquisition rules for success",
  "datasource.logLibrary.views.success.deleted":
    "Delete the acquisition rules for success",
  "datasource.logLibrary.views.deleted.content":
    "Confirm deletion rule: {rule}?",

  // Data Logs-Datasource-Draw
  "datasource.draw.title": "Database Switching",
  "datasource.draw.selected": "Please select an instance",
  "datasource.draw.search": "Search the database",
  "datasource.draw.logLibraryButton": "Add an existing log library",
  "datasource.draw.table.datasource": "Database",
  "datasource.draw.table.datasourceDesc": "Database alias",
  "datasource.draw.table.instance": "Instance",
  "datasource.draw.table.instanceDesc": "The instance alias",
  "datasource.draw.table.deployment": "Deployment way",
  "datasource.draw.table.type": "Database Type",
  "datasource.draw.table.empty.type.tip": "None Database type",
  "datasource.draw.table.operation.tip":
    "Add a log library under this database",
  "datasource.draw.table.delete.tip": "Delete this database",
  "datasource.draw.table.edit.tip": "Edit the database",

  "log.share": "Share",
  "log.share.success":
    "The short link is generated successfully and is valid for 30 days",
  "log.share.error":
    "Share URL error, please try to share again, or refresh the page after operation",

  "log.filter.menu.global": "Pin across all apps",
  "log.filter.menu.unpin": "Unpin",
  "log.filter.menu.enable": "re - enable",
  "log.filter.menu.disable": "temporarily disable",

  "log.filter.edit.title": "Edit filter",
  "log.filter.add.title": "Add filter",
  "log.filter.form.field": "Field",
  "log.filter.form.field.placeholder": "Select a field first",
  "log.filter.form.operator": "Operator",
  "log.filter.form.operator.placeholder": "Please select operator",
  "log.filter.form.value": "Value",
  "log.filter.form.value.placeholder": "Enter a value",
  "log.filter.form.isCustom": "Create custom label?",
  "log.filter.form.custom": "Custom label",

  "log.collectHistory.tooltip": "Collection of records",
  "log.collectHistory.placeholder": "Please enter the content to favorites~",
  "log.collectHistory.modal.title": "Collecting Historical Records",
  "log.collectHistory.modal.alias": "The alias",
  "log.collectHistory.modal.alias.placeholder": "Please enter an alias",

  // log nva
  "log.switch.histogram": "Histogram",
  "log.switch.unfold": "Collapse Log",
  "log.switch.folding": "Folding",
  "log.switch.link": "Link",
  "log.switch.unknown": "The unknown",

  // log link
  "log.link.tips.description": "Specific link ID is required, _key=' link ID'",
  "log.link.tips.formatNotCompliant": "The link log format is not compliant",

  // Data Logs-Statistical Table
  "log.table.note": "Search(Note: Careful operation)",

  // Data Logs-Raw Logs
  "log.empty.logLibrary": "Please select need to query log library",
  "log.search.placeholder": "Please enter a query",
  "log.search.codeHinting.historyQuery": "History",
  "log.search.codeHinting.analysisField": "Field",
  "log.search.codeHinting.keyword": "Keyword",
  "log.search.codeHinting.collectHistory": "Collect",
  "log.search.codeHinting.value": "Value",
  "log.search.icon.quickSearch": "Created Query Criteria",
  "log.search.help.content.specifyField":
    "Specify the field query: Method='Get' and _raw_log_ like '%error%'",
  "log.search.help.content.directionsUse": "Directions for use",
  "log.search.help.content.directionsUse.url":
    "https://clickvisual.gocn.vip/en/clickvisual/03funcintro/instructions.html",
  "log.search.quickSearch.column.placeholder": "Please select column",
  "log.search.quickSearch.operator.placeholder": "Please select operator",
  "log.search.quickSearch.value.placeholder": "Please enter a value",
  "log.search.quickSearch.fill": "Fill",

  "log.index.header.title": "Analysis",
  "log.index.search.placeholder": "Search field",
  "log.index.empty": "Temporarily not create fields",
  "log.index.item.empty": "No Data",
  "log.index.manage": "Index Management",
  "log.index.manage.desc": "Index Management",
  "log.index.help":
    "Fields with an orange background color are system fields or index fields, and fields with a gray background color are fields that are not indexed. Index statistics take effect only for data that has been indexed",
  "log.index.manage.table.header.indexName": "Field Name",
  "log.index.manage.table.header.query": "Enable Query",
  "log.index.manage.table.header.indexType": "Field Type",
  "log.index.manage.table.header.hashType": "Hash Type",
  "log.index.manage.placeholder.indexName":
    "Mandatory and not repeatable, please enter the field name",
  "log.index.manage.placeholder.alias": "Please enter an field description",
  "log.index.manage.enum.zero": "Is not set",
  "log.index.manage.button.deleted": "Drop Field",
  "log.index.manage.button.created": "Created Field",
  "log.index.manage.message.save.success": "Save success",

  "log.highChart.tooltip.startTime": "start time: ",
  "log.highChart.tooltip.endTime": "end time: ",
  "log.highChart.tooltip.num": "count: ",
  "log.highChart.tooltip.prompt": "Click for exact results",

  "log.empty": "No Log Is Queried",
  "log.pagination.total": "Total number of logs: {total}",
  "log.item.copy": "Copy",
  "log.item.copyRowLog": "Copying the project log",
  "log.item.copy.success": "Copy success",
  "log.item.copy.failed": "Replication failed. Please manually copy the data",
  "log.item.moreTag": "View more logs",
  "log.perform.time": "Perform time-consuming",

  // JsonView
  "log.JsonView.unfoldTip": "Please expand and then click",

  // ClickMenu
  "log.ClickMenu.addCondition": "Adding query condition",
  "log.ClickMenu.excludeCondition": "Exclude query condition",
  "log.ClickMenu.viewLink": "See the link",
  "log.ClickMenu.copyValues": "Copy values",

  // dataLogs -> DataSourceMenu -> LogLibraryList-> EditLogLibraryModal
  "log.editLogLibraryModal.modifySuc": "Modified successfully",
  "log.editLogLibraryModal.label.tabName": "Log library Name",
  "log.editLogLibraryModal.label.createType": "Create a type",
  "log.editLogLibraryModal.label.desc.placeholder": "Please enter an alias",
  "log.editLogLibraryModal.label.isCreateCV.name":
    "Whether created by ClickVisual",

  // dataLogs -> DataSourceMenu -> LogLibraryList-> AssociatLogLibraries
  "log.associatLogLibraries.storageId": "Current Log library",
  "log.associatLogLibraries.traceTableId": "Link log library",

  // dataLogs -> SelectedDatabaseDraw -> EditDatabaseModel
  "log.editDatabaseModel.title": "Edit the database",
  "log.editDatabaseModel.label.datasourceType": "Data source type",

  // DateTimeSelectedCard
  "dateTime.relative": "Relatively",
  "dateTime.custom": "Custom",
  "dateTime.option.minutes": "{num} minute{plural}",
  "dateTime.option.hours": "{num} hour{plural}",
  "dateTime.option.days": "{num} day{plural}",
  "dateTime.option.weeks": "{num} week{plural}",
  "dateTime.option.months": "{num} months",
  "dateTime.option.years": "{num} year{plural}",

  // Alarm
  // Rules
  "alarm.rules.selected.placeholder.database": "Please select database",
  "alarm.rules.selected.placeholder.logLibrary": "Please select log library",
  "alarm.rules.selected.placeholder.status": "Please select alarm status",
  "alarm.rules.button.created": "Create Alarm",
  "alarm.rules.table.alarmName": "Alarm Name",
  "alarm.rules.form.level": "Alarm level",
  "alarm.rules.form.level.alarm": "Alarm",
  "alarm.rules.form.level.notice": "Notice",
  "alarm.rules.form.level.serious": "Serious",
  "alarm.rules.table.logLibrary": "Associated log library",
  "alarm.rules.form.title": "Alarm Monitoring Rule",
  "alarm.rules.form.alarmName": "Alarm Name",
  "alarm.rules.form.serviceName": "Service Name",
  "alarm.rules.form.mobiles": "mobile phone numbers",
  "alarm.rules.form.description": "Alarm Description",
  "alarm.rules.form.channelIds": "Notification channels",
  "alarm.rules.form.placeholder.alarmName": "Please enter a alarm name",
  "alarm.rules.form.placeholder.serviceName": "Please input service name",
  "alarm.rules.form.placeholder.mobiles":"Please input phone number, multiple use ',' to split",
  "alarm.rules.form.placeholder.alarmId": "Please enter the alarm Id",
  "alarm.rules.form.placeholder.level": "Please select alarm level",
  "alarm.rules.form.placeholder.description":
    "Please enter an alarm description",
  "alarm.rules.form.placeholder.channelIds":
    "Please select notification channel",
  "alarm.rules.form.rule.alarmName":
    "Please enter lowercase letters, uppercase letters, or underscores",
  "alarm.rules.inspectionFrequency": "Inspection Frequency",
  "alarm.rules.form.inspectionStatistics": "Inspection Statistics",
  "alarm.rules.form.associatedTable": "The associated table",
  "alarm.rules.form.addTable": "Add the associated table",
  "alarm.rules.form.inspectionStatistics.error":
    "At least one table needs to be associated",
  "alarm.rules.form.triggerCondition": "Trigger condition",
  "alarm.rules.form.triggerCondition.error":
    "At least you need to add a trigger condition",
  "alarm.rules.form.noDataOp": "Alert state if no data or all values are null",
  "alarm.rules.form.preview": "Preview",
  "alarm.rules.form.aggregatedData": "Aggregate data",
  "alarm.rules.form.aggregatedIndicators": "Aggregation index",
  "alarm.rules.form.preview.aggregatedData": "Preview aggregated Data",
  "alarm.rules.form.preview.aggregatedIndicators":
    "Preview aggregation indicators",
  "alarm.rules.form.preview.unknownState": "An unknown state",
  "alarm.rules.form.preview.canConfirm": "Can be confirmed",
  "alarm.rules.form.notPreview.content": "Please click preview first",
  "alarm.rules.form.mode": "Alarm mode",
  "alarm.rules.form.level.instructions": "Use the help",
  "alarm.rules.form.mode.normalMode": "Normal mode",
  "alarm.rules.form.mode.aggregationMode": "Aggregation mode",
  "alarm.rules.inspectionFrequency.selectOption.logLibrary": "Log Library",
  "alarm.rules.inspectionFrequency.between": "Between",
  "alarm.rules.inspectionFrequency.database": "Database",
  "alarm.rules.inspectionFrequency.placeholder.database":
    "Please select database",
  "alarm.rules.inspectionFrequency.database.Option":
    "Instance: {instance}, Database: {database}",
  "alarm.rules.inspectionFrequency.logLibrary": "Table",
  "alarm.rules.inspectionFrequency.placeholder.logLibrary":
    "Please select a table",
  "alarm.rules.creator": "Creator",
  "alarm.rules.switch.open": "Pause",
  "alarm.rules.switch.close": "Resume",

  "alarm.rules.info.title": "Alarm Details",
  "alarm.rules.info.view": "View",
  "alarm.rules.info.rule": "Rule",
  "alarm.rules.materializedViews": "Materialized views: ",

  "alarm.rules.created": "Create alarm success",
  "alarm.rules.updated": "Update alarm success",
  "alarm.rules.deleted": "Delete alarm success",
  "alarm.rules.deleted.loading": "Deleting alarm...",
  "alarm.rules.deleted.content": "Are you sure to delete alarm: {alarm}?",

  "alarm.rules.history.column.isPushed":
    "Whether the alarm is pushed successfully",
  "alarm.rules.history.column.ctime": "Triggering time",
  "alarm.rules.history.isPushed.true": "Yes",
  "alarm.rules.history.isPushed.false": "No",
  "alarm.rules.history.title.total": "The total number of alarm",
  "alarm.rules.history.title.sucPublish": "Times of successful push",

  "alarm.rules.state.alerting": "alerting",
  "alarm.rules.state.ok": "ok",
  "alarm.rules.state.paused": "paused",
  "alarm.rules.state.config": "config",

  "alarm.rules.historyBorad.theLog": "The log",
  "alarm.rules.historyBorad.toView": "Viewing Log Details",
  "alarm.rules.historyBorad.ctime": "Creation time",
  "alarm.rules.historyBorad.lastUpdateTime": "Last updated",
  "alarm.rules.historyBorad.checkFrequency": "Check the frequency",
  "alarm.rules.historyBorad.status": "Status",
  "alarm.rules.historyBorad.clickOnTheCopy": "Click on the copy",
  "alarm.rules.historyBorad.user": "User",
  "alarm.rules.historyBorad.table": "Table",
  "alarm.rules.historyBorad.database": "Database",
  "alarm.rules.historyBorad.instance": "Instance",
  "alarm.rules.historyBorad.successPushRate": "Success push rate",
  "alarm.rules.historyBorad.basicInformation": "Basic information",
  "alarm.rules.historyBorad.historicalAlarmStatistics":
    "Historical Alarm Statistics",

  // Notifications
  "alarm.notify.button.created": "Create Channel",
  "alarm.notify.modal.created": "Create notification channel",
  "alarm.notify.created.success": "Create a notification channel success",
  "alarm.notify.sendTest.success":
    "Send successfully, please go to the client for verification ",
  "alarm.notify.modal.updated": "Update notification channel",
  "alarm.notify.updated.success": "Update notification channel success",
  "alarm.notify.modal.title": "Delete the notification channel",
  "alarm.notify.modal.content":
    "Sure to delete notification channel: {channelName}?",
  "alarm.notify.deleted.loading":
    "Deleting notification channel {channelName}...",
  "alarm.notify.deleted.success":
    "Delete the notification channel {channelName} success",
  "alarm.notify.name.placeholder": "Please enter notification name",
  "alarm.notify.type.placeholder": "Please select a type",
  "alarm.notify.url.placeholder": "Please enter the url",

  // alarm -> environment
  "alarm.environment.RuleStoreType.notOpen": "Did not open",
  "alarm.environment.form.notOpen": "Did not open",
  "alarm.environment.RuleStoreType.file": "File",
  "alarm.environment.form.title": "Editing the Alarm Environment",
  "alarm.environment.form.ruleStoreType": "The alarm types",
  "alarm.environment.form.isPrometheusOK": "Prometheus state",
  "alarm.environment.form.isAlertManagerOK": "AlertManager state",
  "alarm.environment.form.isMetricsSamplesOk": "The metrics. Samples status",

  // install
  "install.init.text.databaseInit":
    "To initialize the database, click the install button below",

  "install.init.btn.databaseInit": "Database initialization",

  "install.init.model.databaseInit.successTitle": "Initialization completed",
  "install.init.model.databaseInit.successContent":
    "When the database is initialized, click 'OK' to jump to the login page",

  // sys -> instance
  "systemSetting.instancePanel.roleAssign.modelTitle.name": "Instance",
  "systemSetting.instancePanel.roleAssign.modelTitle.roleAuth":
    "Role authorization",
  "systemSetting.instancePanel.roleAssign.modelLabel.role": "Role",
  "systemSetting.instancePanel.roleAssign.modelBottom.createCustomRoleBtn":
    "Create a user-defined role",
  "systemSetting.instancePanel.roleAssign.loadingText": "In the save",
  "systemSetting.instancePanel.roleAssign.loadingSucText": "Save success",

  "systemSetting.instancePanel.roleAssign.rolesList.collapseItem.authorization":
    "Authorization",

  "systemSetting.instancePanel.roleAssign.rolesList.grantList.scope": "Scope",
  "systemSetting.instancePanel.roleAssign.rolesList.grantList.scope.placeholder":
    "Select an authorized domain name",
  "systemSetting.instancePanel.roleAssign.rolesList.grantList.user": "User",
  "systemSetting.instancePanel.roleAssign.rolesList.grantList.user.placeholder":
    "Select an authorized user",
  "systemSetting.instancePanel.roleAssign.rolesList.grantList.createAuthorization":
    "Create authorization",

  "systemSetting.instancePanel.roleAssign.roleModel.instance": "Instance",
  "systemSetting.instancePanel.roleAssign.roleModel.editModel.title":
    "The update operation",
  "systemSetting.instancePanel.roleAssign.roleModel.editModel.content":
    "Are you sure you want to update the character content?",
  "systemSetting.instancePanel.roleAssign.roleModel.custom": "Customize the",
  "systemSetting.instancePanel.roleAssign.roleModel.role": "Role",
  "systemSetting.instancePanel.roleAssign.roleModel.resources":
    "Subordinate to the resource",
  "systemSetting.instancePanel.roleAssign.roleModel.resources.placeholder":
    "Select the owning resource",
  "systemSetting.instancePanel.roleAssign.roleModel.EnglishName":
    "English name of character",
  "systemSetting.instancePanel.roleAssign.roleModel.EnglishName.placeholder":
    "Please enter the role name",
  "systemSetting.instancePanel.roleAssign.roleModel.roleDescription":
    "Role description",
  "systemSetting.instancePanel.roleAssign.roleModel.roleDescription.placeholder":
    "Please enter a role description",

  "systemSetting.instancePanel.roleAssign.roleModel.detailList.errorText":
    "Add resource authorization",
  "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.subresource":
    "Subresource",
  "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.subresource.placeholder":
    "Select a subresource",
  "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.allow":
    "To allow operation",
  "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.allow.placeholder":
    "Select Permit operation",
  "systemSetting.instancePanel.roleAssign.roleModel.detailList.create":
    "Adding Resource Authorization",

  // sys -> instance -> roleAssign -> RolesList -> CollapseItem -> CollapseTitle
  "systemSetting.instancePanel.roleAssign.rolesList.CollapseTitle":
    "Role authorization ( [subresource]: [To allow operation] )",

  "systemSetting.instancePanel.roleAssign.editModel.title":
    "The update operation",
  "systemSetting.instancePanel.roleAssign.editModel.content":
    "Are you sure you want to update the character content?",

  // sys -> role
  "systemSetting.role.delete.success": "Delete the success",
  "systemSetting.role.delete.title": "Delete operation",
  "systemSetting.role.delete.content":
    "You are sure you want to delete the role: {name}？",
  "systemSetting.role.table.name": "Role name",
  "systemSetting.role.table.desc": "Role description",
  "systemSetting.role.table.belongResource": "Subordinate to the resource",
  "systemSetting.role.table.subResources": "Subresource",
  "systemSetting.role.table.acts": "Acts",
  "systemSetting.role.filtrate.label.belongResource":
    "Subordinate to the resource",
  "systemSetting.role.filtrate.label.name": "Name",
  "systemSetting.role.filtrate.clear": "Removal of conditions",
  "systemSetting.role.filtrate.rootAuthority": "Root authority",
  "systemSetting.role.filtrate.createDefaultRole": "Creating a Default Role",
  "systemSetting.role.filtrate.superAdministratorAuthorization":
    "Super Administrator Authorization",

  // sys -> role -> CollapseX
  "systemSetting.role.collapseX.unfold": "Unfold",
  "systemSetting.role.collapseX.packUp": "Pack up",

  // sys -> role -> ItemForm
  "systemSetting.role.itemForm.form.label.belongResource":
    "Subordinate to the resource",
  "systemSetting.role.itemForm.form.belongResource.placeholder":
    "Please select the owning type",
  "systemSetting.role.itemForm.form.belongResource.instance": "Instance",
  "systemSetting.role.itemForm.form.label.roleName": "Role name",
  "systemSetting.role.itemForm.form.roleName.rules":
    "Please enter the role name",
  "systemSetting.role.itemForm.form.mandatory": "Mandatory",
  "systemSetting.role.itemForm.form.label.description": "Role description",
  "systemSetting.role.itemForm.form.description.rules":
    "Enter role description information",
  "systemSetting.role.itemForm.form.label.sub_resources": "Subresource",
  "systemSetting.role.itemForm.form.sub_resources.rules":
    "Select a subresource",
  "systemSetting.role.itemForm.form.label.acts": "To allow operation",
  "systemSetting.role.itemForm.form.acts.rules":
    "Select Authorization operation",

  // sys -> role -> RootUserForm
  "systemSetting.role.rootUserForm.superAdministrator": "Super administrator",
  "systemSetting.role.rootUserForm.superAdministrator.rules":
    "Please select at least one user!",

  // sys -> user
  "sys.user.allCopy": "Copy all",
  "sys.user.resetSuccess": "Reset the success",
  "sys.user.resetPassword": "To reset your password",
  "sys.user.resetTip": "Are you sure to reset the password for user {user}?",
  "sys.user.createUser": "Create a user",
  "sys.user.username": "Login account",
  "sys.user.nickname": "Display User name",
  "sys.user.deleteName": "Delete user",
  "sys.user.deleteNameTips": "Are you sure to delete user '{user}'?",
  "sys.user.deleteName.success": "Deleting a User Succeeded",

  // hooks->role
  "hooks.role.create.ing": "Being added",
  "hooks.role.create.failure": "Create a failure",
  "hooks.role.create.success": "Add a success",
  "hooks.role.create.failure.tips": "Role creation failed please try again!",
  "hooks.role.authorization.ing": "The authorization...",
  "hooks.role.authorization.failure": "Authorization failure",
  "hooks.role.authorization.success": "Authorization success",
  "hooks.role.authorization.failure.tips":
    "Authorization failed please try again!",

  // models -> pms
  "models.pms.creating": "Creating...",
  "models.pms.create.suc": "Creating a successful",
  "models.pms.updating": "Updating...",
  "models.pms.update.suc": "The update is successful",
  "models.pms.permissions.failureText":
    "Description Failed to obtain basic permission information",

  // bigdata realtime
  "bigdata.realtime.table": "Table",
  "bigdata.realtime.database": "Database",
  "bigdata.realtime.buildTableSQL": "Build table SQL",

  // bigdata workflow
  "bigdata.workflow.header.title": "Business Process",

  "bigdata.workflow.rightMenu.add": "Create Business Processes",
  "bigdata.workflow.rightMenu.update": "Edit Business Processes",
  "bigdata.workflow.rightMenu.delete": "Delete Business Process",

  "bigdata.workflow.form.name": "Business Process",
  "bigdata.workflow.form.name.placeholder":
    "Please enter a business process name",
  "bigdata.workflow.add.success": "Create business process successfully",
  "bigdata.workflow.update.success": "Update Business Process Success",
  "bigdata.workflow.delete.content": "Confirm Business Process: {workflow}?",
  "bigdata.workflow.delete.loading": "Delete business process...",
  "bigdata.workflow.delete.success": "Delete business process successfully",

  "bigdata.workflow.dataIntegration": "Data integration",
  "bigdata.workflow.dataDevelopment": "Data Analytics",
  "bigdata.workflow.board": "Kanban Board",

  // bigdata DataSourceManage
  "bigdata.dataSourceManage.searchBar.dataSourceType.placeholder":
    "Select a data source type",
  "bigdata.dataSourceManage.searchBar.dataSourceType.create":
    "Create data source",

  "bigdata.dataSourceManage.dataTable.dataSourceName": "Name",
  "bigdata.dataSourceManage.dataTable.linkInformation":
    "The connection information",
  "bigdata.dataSourceManage.dataTable.dataSourceDesc": "Description",
  "bigdata.dataSourceManage.dataTable.deleteDataSourceTips":
    "Are you sure to delete dataSource 『{dataSource}』",

  "bigdata.dataSourceManage.create.typ": "Type",
  "bigdata.dataSourceManage.create.userName": "The user name",

  // bigdata components
  "bigdata.components.SQLEditor.selectFile": "Please select file",

  "bigdata.components.RightMenu.properties": "Properties",
  "bigdata.components.RightMenu.versions": "Versions",
  "bigdata.components.RightMenu.Versions.tips": "Version history",
  "bigdata.components.RightMenu.results.title": "Running history",
  "bigdata.components.RightMenu.results": "Results",
  "bigdata.components.RightMenu.results.tips": "The results",
  "bigdata.components.RightMenu.notResults": "There is no running history",
  "bigdata.components.RightMenu.results.executionTime": "The execution time",
  "bigdata.components.RightMenu.results.ExecutionDuration":
    "Execution duration",
  "bigdata.components.RightMenu.results.timingTask": "Timing task",
  "bigdata.components.RightMenu.results.notResultsId": "No result ID found",

  "bigdata.components.RightMenu.VersionHistory.submitter": "Submit one",
  "bigdata.components.RightMenu.VersionHistory.SubmitTime": "Submit time",
  "bigdata.components.RightMenu.VersionHistory.details": "Details",
  "bigdata.components.RightMenu.VersionHistory.drawer.title": "Version history",
  "bigdata.components.RightMenu.VersionHistory.childDrawer.title": "The query",

  "bigdata.components.RightMenu.Scheduling.Modify": "Modify the",
  "bigdata.components.RightMenu.Scheduling.secondary.all": "Any",
  "bigdata.components.RightMenu.Scheduling.secondary.dataIntegration":
    "Data integration",
  "bigdata.components.RightMenu.Scheduling.secondary.dataMining":
    "Data Analytics",
  "bigdata.components.RightMenu.Scheduling.secondary.board": "Board",
  "bigdata.components.RightMenu.Scheduling.secondary.universal": "General node",
  "bigdata.components.RightMenu.Scheduling.name": "Name",
  "bigdata.components.RightMenu.Scheduling.nodeType": "Type",
  "bigdata.components.RightMenu.Scheduling.basicConfig": "General",
  "bigdata.components.RightMenu.Scheduling.isPerform": "Perform",
  "bigdata.components.RightMenu.Scheduling.channelIds": "Failure alarm",
  "bigdata.components.RightMenu.Scheduling.thoseResponsible": "Owner",
  "bigdata.components.RightMenu.Scheduling.cronTips":
    "Scheduling rule cron field fill in the help document",
  "bigdata.components.RightMenu.Scheduling.Parameter.title": "Parameter",
  "bigdata.components.RightMenu.Scheduling.Parameter.newButton":
    "The new parameters",
  "bigdata.components.RightMenu.Scheduling.Parameter.key.placeholder":
    "Please enter a parameter name",
  "bigdata.components.RightMenu.Scheduling.Parameter.val.placeholder":
    "Assign values to the parameters",

  "bigdata.components.RightMenu.Scheduling.Schedule": "Schedule",
  "bigdata.components.RightMenu.Scheduling.autoRerun": "Auto Rerun upon Error",
  "bigdata.components.RightMenu.Scheduling.rerunsNumber": "Number of Reruns",
  "bigdata.components.RightMenu.Scheduling.rerunInterval": "Rerun Interval",

  "bigdata.components.Results.involvedSQLs.key.placeholder":
    "Please select view",

  "bigdata.components.Nav.navList.dataSourceManage": "Data Source",
  "bigdata.components.Nav.navList.statisticalBoard": "Statistical Board",
  "bigdata.components.Nav.navList.taskExecutionDetails":
    "Task Execution Details",

  "bigdata.components.FolderTree.createFolderPrompt":
    "Currently, only level 2 folders are supported~",
  "bigdata.components.FolderTree.iconList.createNode": "Create a node",
  "bigdata.components.FolderTree.iconList.createFolder": "Creating a folder",
  "bigdata.components.FolderTree.folderName": "The file name",

  "bigdata.components.FolderTree.FolderTitle.node": "Node",
  "bigdata.components.FolderTree.FolderTitle.folder": "Folder",
  "bigdata.components.FolderTree.FolderTitle.deleteTips":
    "Are you sure to delete? type: ",

  "bigdata.components.FolderTree.crateNode.createTitle": "Create a node",
  "bigdata.components.FolderTree.crateNode.updateTitle": "Modify the node",
  "bigdata.components.FolderTree.crateNode.tertiarySelect.placeholder":
    "Please select a tertiary",
  "bigdata.components.FolderTree.crateNode.sourceSelect.placeholder":
    "Please select a source",
  "bigdata.components.FolderTree.crateNode.nodeName.placeholder":
    "Please enter a node name",
  "bigdata.components.FolderTree.crateNode.nodeDesc.placeholder":
    "Please enter a node description",

  "bigdata.components.FolderTree.crateFolder.createTitle": "Create Folder",
  "bigdata.components.FolderTree.crateFolder.updateTitle": "Modifying folders",
  "bigdata.components.FolderTree.crateFolder.secondary.placeholder":
    "Please select a secondary",

  "bigdata.components.FileTitle.fileType.realtime": "Realtime",
  "bigdata.components.FileTitle.fileType.offline": "Offline",
  "bigdata.components.FileTitle.fileType.default": "Unknown file",
  "bigdata.components.FileTitle.NodeStatus.pending": "pending",
  "bigdata.components.FileTitle.NodeStatus.inProgress": "The execution of",
  "bigdata.components.FileTitle.NodeStatus.ExecutionException":
    "Perform abnormal",
  "bigdata.components.FileTitle.NodeStatus.ExecuteComplete": "completes",
  "bigdata.components.FileTitle.NodeStatus.PendingRun": "Waiting for run",
  "bigdata.components.FileTitle.user.invalidUser": "Invalid user",
  "bigdata.components.FileTitle.user.editing": "Editing",
  "bigdata.components.FileTitle.user.readOnly": "Read-only",
  "bigdata.components.FileTitle.startEditing": "Start editing",
  "bigdata.components.FileTitle.exitEditor": "Exit the editor",
  "bigdata.components.FileTitle.grabTheLock": "Grab the lock",
  "bigdata.components.FileTitle.grabLockSuccessful": "Grab lock successfully",
  "bigdata.components.FileTitle.formatting": "Formatting",
  "bigdata.components.FileTitle.run": "run",
  "bigdata.components.sqlSaveTips":
    "After obtaining the edit permission, you can save it",

  "bigdata.models.dataAnalysis.runLoadingText": "The running",
  "bigdata.models.dataAnalysis.runLoadingDoneText": "The successful running",
  "bigdata.models.dataAnalysis.unlockTips":
    "The current changes are not saved. Are you sure you want to unlock them",

  "bigdata.models.dataAnalysis.useManageNodeAndFolder.stopping": "Stopping",
  "bigdata.models.dataAnalysis.useManageNodeAndFolder.stopSuccess":
    "Stop success",
  "bigdata.models.dataAnalysis.useManageNodeAndFolder.saveBoardNodesTips":
    "There must be and only one set of start and end nodes",
  "bigdata.models.dataAnalysis.useManageNodeAndFolder.all": "All",
  "bigdata.models.dataAnalysis.useManageNodeAndFolder.start": "Start node",
  "bigdata.models.dataAnalysis.useManageNodeAndFolder.end": "End node",

  // dataAnalysis -> StatisticalBoard
  "bigdata.dataAnalysis.statisticalBoard.Screening.yesterday": "Yesterday",
  "bigdata.dataAnalysis.statisticalBoard.Screening.beforeYesterday":
    "The day before yesterday",
  "bigdata.dataAnalysis.statisticalBoard.Screening.nearlyWeek": "In seven days",
  "bigdata.dataAnalysis.statisticalBoard.Screening.inCharge":
    "I am in charge of the",

  "bigdata.dataAnalysis.statisticalBoard.Screening.failureInstance":
    "Failed task",
  "bigdata.dataAnalysis.statisticalBoard.Screening.successfulInstance":
    "Task of success",
  "bigdata.dataAnalysis.statisticalBoard.Screening.unknownInstance":
    "Unknown task",
  "bigdata.dataAnalysis.statisticalBoard.Screening.failureNode": "Node failure",
  "bigdata.dataAnalysis.statisticalBoard.Screening.successfulNode":
    "Successful node",
  "bigdata.dataAnalysis.statisticalBoard.Screening.unknownNode":
    "The unknown node",

  "bigdata.dataAnalysis.statisticalBoard.DashboardTop.title": "Focus on the",
  "bigdata.dataAnalysis.statisticalBoard.RunningStatus.title":
    "Running status distribution",
  "bigdata.dataAnalysis.statisticalBoard.CompletionTask.title":
    "Completion of task",

  // dataAnalysis -> TaskExecutionDetails
  "bigdata.dataAnalysis.taskExecutionDetails.column.status.name":
    "Execution status",
  "bigdata.dataAnalysis.taskExecutionDetails.column.status.successful":
    "Execute successfully",
  "bigdata.dataAnalysis.taskExecutionDetails.column.status.failure":
    "On failure",
  "bigdata.dataAnalysis.taskExecutionDetails.column.tertiary.name": "Task type",
  "bigdata.dataAnalysis.taskExecutionDetails.column.crontab.name":
    "Regular time",
  "bigdata.dataAnalysis.taskExecutionDetails.column.cost.name":
    "The running time",
  "bigdata.dataAnalysis.taskExecutionDetails.column.startTime.name":
    "The start time",
  "bigdata.dataAnalysis.taskExecutionDetails.column.endTime.name":
    "The end of time",

  "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.nodeSearch":
    "Nodes in the search",
  "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.nodeName":
    "The name of the node",
  "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.businessDate":
    "Business date",
  "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.nodeType":
    "The node type",
  "bigdata.dataAnalysis.taskExecutionDetails.TaskFilter.nodeType.placeholder":
    "Select a node type",

  "pandas.analysis.data.source": "Source",
  "pandas.analysis.data.filter": "Data filter",
  "pandas.analysis.data.filter.placeholder":
    "Fill in the filtering criteria according to the corresponding SQL syntax",
  "pandas.analysis.data.target": "Target",
  "pandas.analysis.data.target.before": "Before import",
  "pandas.analysis.data.target.before.placeholder":
    "Please refer to the corresponding SQL syntax to fill out the import data to execute SQL script",
  "pandas.analysis.data.target.after": "After import",
  "pandas.analysis.data.target.after.placeholder":
    "Please refer to the corresponding SQL syntax import data after the execution of the SQL script;",
};
