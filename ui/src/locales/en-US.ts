export default {
  operation: "Operation",
  add: "Add",
  search: "Search",
  edit: "Edit",
  delete: "Delete",
  submit: "Submit",
  description: "Description",
  loading: "loading",
  loadingDone: "Loading successful",
  "error.title": "Request Failed",
  "error.default": "Unknown error, please contact responsible",
  "error.content": "Error: {msg}",
  "error.copy": "Copy error message",
  "button.save": "Save",
  "button.cancel": "Cancel",
  spin: "loading...",
  "table.column.filter.placeholder": "Please input conditions",
  "table.column.filter.reset": "Reset",
  required: "Required",

  type: "Type",

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
  "footer.copyright": `@ 2021 ~ ${new Date().getFullYear()} by shimo`,

  // menu
  "menu.configure": "Config",
  "menu.log": "Logs",
  "menu.alarm": "Alarm",
  "menu.systemSettings": "Setting",
  "menu.systemSettings.database": "Instances",
  "menu.systemSettings.cluster": "Cluster",

  // user
  "login.header": "Welcome to MOGO",
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
  "instance.button.add": "Add instance",
  "instance.instanceName": "Instance Name",
  "instance.datasource": "Datasource",
  "instance.storagePah": "Storage Path",
  "instance.delete.confirmTip": "Confirm deleting instance: {instanceName} ?",
  "instance.form.title.created": "Create Instance",
  "instance.form.title.edit": "Edit Instance",
  "instance.form.title.cluster": "Cluster",
  "instance.form.title.ruleStoreType": "Alarm Storage",
  "instance.form.title.ruleStoreType.tip":
    "The storage method of the alarm rules of the alarm center",
  "instance.form.title.ruleStoreType.radio.file": "File",
  "instance.form.title.ruleStoreType.radio.enable": "Closure",
  "instance.form.title.filePath": "File Path",
  "instance.form.placeholder.instanceName": "Please enter an instance name",
  "instance.form.placeholder.datasource": "Please select datasource",
  "instance.form.placeholder.dsn": "Please enter DSN, for example: {example}",
  "instance.form.placeholder.filePath": "Please enter the file path",
  "instance.form.moreOptions": "More Options",
  "instance.form.rule.dsn": "Please enter DSN",
  "instance.form.rule.configmap": "Please select ConfigMap",
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
  "cluster.k8sConfiguration": "K8s configuration",
  "cluster.delete.confirmTip": "Confirm deleting cluster: {clusterName}?",
  "cluster.form.title.created": "Create Cluster",
  "cluster.form.title.edit": "Edit Cluster",
  "cluster.form.status": "Cluster Status",
  "cluster.form.status.normality": "Normality",
  "cluster.form.status.anomaly": "Anomaly",
  "cluster.form.placeholder.clusterName": "Please enter a cluster name",
  "cluster.form.placeholder.apiServer": "http://localhost:6443",
  "cluster.form.placeholder.k8sConfiguration":
    "Please enter k8s cluster configuration",
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
    "Please enter lowercase letters, uppercase letters, or hyphens",

  "datasource.logLibrary.placeholder.tableName":
    "Please enter the name of the data table in upper or lower case English or underscore",
  "datasource.logLibrary.placeholder.type": "Please select a table type",
  "datasource.logLibrary.placeholder.days": "Please enter the log to save days",
  "datasource.logLibrary.placeholder.brokers": "kafka:9092",
  "datasource.logLibrary.placeholder.topics":
    "Please enter Topics, support in uppercase or lowercase English or crossed",
  "datasource.logLibrary.placeholder.consumers": "Please enter Consumers",

  "datasource.logLibrary.empty":
    "Not query to the relevant logging library list",
  "datasource.logLibrary.quickAdd": "Create log library",
  "datasource.tooltip.icon.info": "Log Library Details",
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
  "datasource.draw.table.datasource": "Database",
  "datasource.draw.table.instance": "Instance",
  "datasource.draw.table.type": "Database Type",
  "datasource.draw.table.empty.type.tip": "None Database type",

  // Data Logs-Raw Logs
  "log.empty.logLibrary": "Please select need to query log library",
  "log.search.placeholder": "Please enter a query",
  "log.search.icon.quickSearch": "Created Query Criteria",
  "log.search.help.title.inquire": "Inquire：",
  "log.search.help.content.specifyField":
    "Specify the field query: Method='Get' and _raw_log_ like '%error%'",
  "log.search.quickSearch.column.placeholder": "Please select column",
  "log.search.quickSearch.operator.placeholder": "Please select operator",
  "log.search.quickSearch.value.placeholder": "Please enter a value",

  "log.index.header.title": "Analysis",
  "log.index.search.placeholder": "Search index",
  "log.index.empty": "Temporarily not create indexes",
  "log.index.item.empty": "No Data",
  "log.index.manage":
    "Index Management(This function is available when the _RAW_log_ field format is JSON)",
  "log.index.help":
    "Fields with an orange background color are system fields or index fields, and fields with a gray background color are fields that are not indexed. Index statistics take effect only for data that has been indexed",
  "log.index.manage.table.header.indexName": "Index Name",
  "log.index.manage.table.header.query": "Enable Query",
  "log.index.manage.table.header.indexType": "Index Type",
  "log.index.manage.placeholder.indexName":
    "Mandatory and not repeatable, please enter the index name",
  "log.index.manage.placeholder.alias": "Please enter an index description",
  "log.index.manage.button.deleted": "Drop Index",
  "log.index.manage.button.created": "Created Index",
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

  // DateTimeSelectedCard
  "dateTime.relative": "Relatively",
  "dateTime.custom": "Custom",
  "dateTime.option.minutes": "{num} minute{plural}",
  "dateTime.option.hours": "{num} hour{plural}",
  "dateTime.option.days": "{num} day{plural}",
  "dateTime.option.months": "{num} months",
  "dateTime.option.years": "{num} year{plural}",

  // Alarm
  // Operations
  "alarm.selected.placeholder.database": "Please select database",
  "alarm.selected.placeholder.logLibrary": "Please select log library",
  "alarm.button.created": "Create Alarm",
  "alarm.table.alarmName": "Alarm Name",
  "alarm.form.title": "Alarm Monitoring Rule",
  "alarm.form.alarmName": "Alarm Name",
  "alarm.form.description": "Alarm Description",
  "alarm.form.placeholder.alarmName": "Please enter a alarm name",
  "alarm.form.placeholder.description": "Please enter an alarm description",
  "alarm.form.rule.alarmName":
    "Please enter lowercase letters, uppercase letters, or underscores",
  "alarm.inspectionFrequency": "Inspection Frequency",
  "alarm.form.inspectionStatistics": "Inspection Statistics",
  "alarm.form.inspectionStatistics.error":
    "At least you need to add a inspection statistics",
  "alarm.form.triggerCondition": "Trigger condition",
  "alarm.form.triggerCondition.error":
    "At least you need to add a trigger condition",
  "alarm.form.preview": "Preview",
  "alarm.form.notPreview.content": "Please click preview first",
  "alarm.inspectionFrequency.selectOption.logLibrary": "Log Library",
  "alarm.inspectionFrequency.between": "Between",
  "alarm.inspectionFrequency.database": "Database",
  "alarm.inspectionFrequency.placeholder.database": "Please select database",
  "alarm.inspectionFrequency.logLibrary": "Table",
  "alarm.inspectionFrequency.placeholder.logLibrary": "Please select a table",

  "alarm.created": "Create alarm success",
  "alarm.updated": "Update alarm success",
  "alarm.deleted": "Delete alarm success",
  "alarm.deleted.loading": "Deleting alarm...",
  "alarm.deleted.content": "Are you sure to delete alarm: {alarm}?",
};
