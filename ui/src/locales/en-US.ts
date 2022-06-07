export default {
  operation: "Operation",
  create: "Create",
  add: "Add",
  search: "Search",
  edit: "Edit",
  delete: "Delete",
  submit: "Submit",
  description: "Description",
  DescAsAlias: "Alias",
  loading: "loading",
  loadingDone: "Loading successful",
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
  required: "Required",

  type: "Type",
  status: "Status",
  dingTalk: "DingTalk",

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
  "navbar.upgrade.lodingText": "In the upgrade",
  "navbar.upgrade.successText": "Upgrade success",
  "footer.copyright": `@2021~${new Date().getFullYear()} by ClickVisual`,

  // menu
  "menu.configure": "Config",
  "menu.log": "Logs",
  "menu.alarm": "Alarm",
  "menu.alarm.rules": "Alarm Rules",
  "menu.alarm.notifications": "Notification Channel",
  "menu.systemSettings": "Setting",
  "menu.systemSettings.database": "Instances",
  "menu.systemSettings.cluster": "Cluster",
  "menu.systemSettings.events": "Event Center",
  "menu.systemSettings.pms": "Authority Management",
  "menu.systemSettings.role": "Role Management",
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
  "instance.form.title.ruleStoreType.radio.enable": "Closure",
  "instance.form.title.filePath": "File Path",
  "instance.form.placeholder.instanceName": "Please enter an instance name",
  "instance.form.placeholder.datasource": "Please select datasource",
  "instance.form.placeholder.mode": "Please select a type",
  "instance.form.placeholder.clusterName": "Please enter a cluster name",
  "instance.form.placeholder.dsn": "Please enter DSN, for example: {example}",
  "instance.form.placeholder.filePath": "Please enter the file path",
  "instance.form.moreOptions": "More Options",
  "instance.form.rule.dsn": "Please enter DSN",
  "instance.form.rule.configmap": "Please select ConfigMap",
  "instance.form.test.warning": "Please enter DNS and test again",
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
  "datasource.deleted.content": "Confirm deleting database: {database}?",
  "datasource.deleted.loading": "Deleting a database: {database}...",
  "datasource.deleted.success": "Delete database: {database} succeeded",

  "datasource.logLibrary.from.tableName": "Table Name",
  "datasource.logLibrary.from.rule.tableName":
    "Please enter lowercase letters, uppercase letters, or underscores",
  "datasource.logLibrary.from.type": "_time_ Field Type",
  "datasource.logLibrary.from.days": "Log Retention Days",
  "datasource.logLibrary.from.brokers": "Brokers",
  "datasource.logLibrary.from.topics": "Topics",
  "datasource.logLibrary.from.consumers": "Consumers",
  "datasource.logLibrary.from.rule.topics":
    "Please enter numbers/letters/hyphens/underline",
  "datasource.logLibrary.from.creationMode": "Creation Mode",

  "datasource.logLibrary.from.creationMode.option.newLogLibrary":
    "Create a log library",
  "datasource.logLibrary.from.creationMode.option.logLibrary":
    "Select an existing log library",
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
  "datasource.logLibrary.placeholder.type": "Please select a table type",
  "datasource.logLibrary.placeholder.days": "Please enter the log to save days",
  "datasource.logLibrary.placeholder.brokers": "kafka:9092",
  "datasource.logLibrary.placeholder.topics":
    "Please type Topics with numbers, letters, or hyphens",
  "datasource.logLibrary.placeholder.consumers": "Please enter Consumers",

  "datasource.logLibrary.empty":
    "Not query to the relevant logging library list",
  "datasource.logLibrary.quickAdd": "Create log library",
  "datasource.tooltip.icon.info": "Log Library Details",
  "datasource.tooltip.icon.edit": "Edit log library",
  "datasource.tooltip.icon.alarmRuleList": "Alarm Rule List",
  "datasource.tooltip.icon.view": "Configure data acquisition rules",
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

  // Data Logs-Log Query Types MenuItem
  "log.queryType.menuItem.rawLog": "Raw",
  "log.queryType.menuItem.statisticalTable": "Table",

  "log.share": "Share",
  "log.share.success": "The URL is pasted to the clipboard",
  "log.share.error":
    "Share URL error, please try to share again, or refresh the page after operation",

  // log nva
  "log.switch.histogram": "Histogram",

  // Data Logs-Statistical Table
  "log.table.note":
    "Note: The default return limit for the current request is 100 lines. For more results, add your own restriction statements",

  // Data Logs-Raw Logs
  "log.empty.logLibrary": "Please select need to query log library",
  "log.search.placeholder": "Please enter a query",
  "log.search.icon.quickSearch": "Created Query Criteria",
  "log.search.help.content.specifyField":
    "Specify the field query: Method='Get' and _raw_log_ like '%error%'",
  "log.search.quickSearch.column.placeholder": "Please select column",
  "log.search.quickSearch.operator.placeholder": "Please select operator",
  "log.search.quickSearch.value.placeholder": "Please enter a value",

  "log.index.header.title": "Analysis",
  "log.index.search.placeholder": "Search field",
  "log.index.empty": "Temporarily not create fields",
  "log.index.item.empty": "No Data",
  "log.index.manage":
    "Index Management(This function is available when the _RAW_log_ field format is JSON)",
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
  "log.item.copy.success": "Copy success",
  "log.item.copy.failed": "Replication failed. Please manually copy the data",
  "log.item.moreTag": "View more logs",

  // JsonView
  "log.JsonView.unfoldTip": "Please expand and then click",

  // ClickMenu
  "log.ClickMenu.addCondition": "Adding a query condition",
  "log.ClickMenu.excludeCondition": "Exclude query criteria",
  "log.ClickMenu.copyValues": "Copy values",

  // dataLogs -> DataSourceMenu -> LogLibraryList-> EditLogLibraryModal
  "log.editLogLibraryModal.modifySuc": "Modify the success",
  "log.editLogLibraryModal.label.tabName": "Log library Name",
  "log.editLogLibraryModal.label.createType": "Create a type",
  "log.editLogLibraryModal.label.desc.placeholder": "Please enter an alias",

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
  "alarm.rules.table.logLibrary": "Associated log library",
  "alarm.rules.form.title": "Alarm Monitoring Rule",
  "alarm.rules.form.alarmName": "Alarm Name",
  "alarm.rules.form.description": "Alarm Description",
  "alarm.rules.form.channelIds": "Notification channels",
  "alarm.rules.form.placeholder.alarmName": "Please enter a alarm name",
  "alarm.rules.form.placeholder.description":
    "Please enter an alarm description",
  "alarm.rules.form.placeholder.channelIds":
    "Please select notification channel",
  "alarm.rules.form.rule.alarmName":
    "Please enter lowercase letters, uppercase letters, or underscores",
  "alarm.rules.inspectionFrequency": "Inspection Frequency",
  "alarm.rules.form.inspectionStatistics": "Inspection Statistics",
  "alarm.rules.form.inspectionStatistics.error":
    "At least you need to add a inspection statistics",
  "alarm.rules.form.triggerCondition": "Trigger condition",
  "alarm.rules.form.triggerCondition.error":
    "At least you need to add a trigger condition",
  "alarm.rules.form.noDataOp": "Alert state if no data or all values are null",
  "alarm.rules.form.preview": "Preview",
  "alarm.rules.form.notPreview.content": "Please click preview first",
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
  "alarm.notify.button.test": "test",
  "alarm.notify.modal.created": "Create notification channel",
  "alarm.notify.created.success": "Create a notification channel success",
  "alarm.notify.sendTest.success": "Send successfully, please go to the client for verification ",
  "alarm.notify.modal.updated": "Update notification channel",
  "alarm.notify.updated.success": "Update notification channel success",
  "alarm.notify.modal.title": "Delete the notification channel",
  "alarm.notify.modal.content":
    "Sure to delete notification channel: {channelName}?",
  "alarm.notify.deleted.loading":
    "Deleting notification channel {channelName}...",
  "alarm.notify.deleted.success":
    "Delete the notification channel {channelName} success",

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
};
