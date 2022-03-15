CREATE DATABASE mocro DEFAULT CHARSET utf8mb4;
USE mocro;

CREATE TABLE `mogo_event` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `source` varchar(64) NOT NULL DEFAULT '' COMMENT '事件来源',
    `user_name` varchar(32) NOT NULL DEFAULT '' COMMENT '操作用户的名字',
    `uid` bigint(20) NOT NULL DEFAULT '0' COMMENT '操作用户的uid',
    `operation` varchar(64) NOT NULL DEFAULT '' COMMENT '操作名',
    `object_type` varchar(64) NOT NULL DEFAULT '' COMMENT '被操作对象的类型(一般为db.Table名)',
    `object_id` bigint(20) NOT NULL DEFAULT '0' COMMENT '被操作对象类型(db.Table)下的具体对象的主键(id)',
    `metadata` text NOT NULL COMMENT '事件内容',
    `ctime` bigint(20) NOT NULL DEFAULT '0' COMMENT '事件发生时间',
    PRIMARY KEY (`id`),
    KEY `idx_source` (`source`),
    KEY `idx_operation` (`operation`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

CREATE TABLE `mogo_alarm_channel` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `name` varchar(128) NOT NULL COMMENT '告警渠道名称',
    `key` text COMMENT '关键信息',
    `typ` int(11) DEFAULT NULL COMMENT '告警类型：0 dd ',
    `uid` int(11) DEFAULT NULL COMMENT '操作人',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '告警渠道' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_alarm_history` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `alarm_id` int(11) DEFAULT NULL COMMENT 'alarm id',
    `is_pushed` tinyint(1)  DEFAULT NULL COMMENT '推送状态',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '告警渠道' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_alarm` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `tid` int(11) DEFAULT NULL COMMENT 'table id',
    `uid` int(11) DEFAULT NULL COMMENT '操作人',
    `uuid` varchar(128) NOT NULL COMMENT '唯一外键',
    `name` varchar(64) NOT NULL COMMENT '告警名称',
    `desc` varchar(255) NOT NULL COMMENT '描述说明',
    `interval` int(11) DEFAULT NULL COMMENT '告警频率',
    `status` int(11) DEFAULT NULL COMMENT '告警状态',
    `rule_store_type` int(11) DEFAULT NULL COMMENT 'rule_store_type 0 集群 1 文件',
    `unit` int(11) DEFAULT NULL COMMENT '0 m 1 s 2 h 3 d 4 w 5 y',
    `alert_rule` text COMMENT 'prometheus alert rule',
    `view` text COMMENT '数据转换视图',
    `view_table_name` varchar(255) NOT NULL COMMENT 'view_table_name',
    `tag` text COMMENT '标签数据',
    `channel_ids` varchar(255) NOT NULL COMMENT '推送渠道',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '告警配置' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_alarm_filter` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `tid` int(11) DEFAULT NULL COMMENT 'table id',
    `alarm_id` int(11) DEFAULT NULL COMMENT 'alarm id',
    `when` text COMMENT '执行条件',
    `set_operator_typ` int(11) NOT NULL COMMENT '0 不合并 1 笛卡尔积 2 拼接 3 内联 4 左联 5 右连 7 全连 8 左斥 9 右斥',
    `set_operator_exp` varchar(255) NOT NULL COMMENT '操作',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '告警过滤条件' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_alarm_condition` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `alarm_id` int(11) DEFAULT NULL COMMENT 'alarm id',
    `set_operator_typ` int(11) DEFAULT NULL COMMENT '0 WHEN 1 AND 2 OR',
    `set_operator_exp` int(11) DEFAULT NULL COMMENT '0 avg 1 min 2 max 3 sum 4 count',
    `cond` int(11) DEFAULT NULL COMMENT '0 above 1 below 2 outside range 3 within range',
    `val_1` int(11) DEFAULT NULL COMMENT '基准值/最小值',
    `val_2` int(11) DEFAULT NULL COMMENT '最大值',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '告警触发条件' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_base_instance` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `datasource` varchar(32) NOT NULL COMMENT '数据源类型',
    `name` varchar(128) NOT NULL COMMENT '实例名称',
    `dsn` text COMMENT 'dsn',
    `rule_store_type` int(11) DEFAULT NULL COMMENT 'rule_store_type 0 集群 1 文件',
    `file_path` varchar(255) DEFAULT NULL COMMENT 'file_path',
    `cluster_id` int(11) DEFAULT NULL COMMENT 'cluster_id',
    `namespace` varchar(128) NOT NULL COMMENT 'namespace',
    `configmap` varchar(128) NOT NULL COMMENT 'configmap',
    `prometheus_target` varchar(128) NOT NULL COMMENT 'prometheus ip or domain, eg: https://prometheus:9090',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_datasource_name` (`datasource`,`name`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '服务配置存储' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_base_database` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `iid` int(11) DEFAULT NULL COMMENT '实例 id',
    `name` varchar(32) NOT NULL COMMENT '数据库名称',
    `uid` int(11) DEFAULT NULL COMMENT '操作人',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_iid_name` (`iid`,`name`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '数据库管理' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_base_table` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `did` int(11) DEFAULT NULL COMMENT '数据库 id',
    `name` varchar(32) NOT NULL COMMENT 'table',
    `typ` int(11) DEFAULT NULL COMMENT 'table 类型 1 app 2 ego 3 ingress',
    `days` int(11) DEFAULT NULL COMMENT '数据过期时间',
    `brokers` varchar(255) NOT NULL COMMENT 'kafka broker',
    `topic` varchar(128) NOT NULL COMMENT 'kafka topic',
    `sql_data` text COMMENT 'sql_data',
    `sql_stream` text COMMENT 'sql_stream',
    `sql_view` text COMMENT 'sql_view',
    `uid` int(11) DEFAULT NULL COMMENT '操作人',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_did_name` (`did`, `name`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT 'TABLE 管理' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_base_index` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `tid` int(11) DEFAULT NULL COMMENT 'table id',
    `field` varchar(128) NOT NULL COMMENT '字段',
    `typ` int(11) NOT NULL COMMENT '字段 0 text 1 long 2 double',
    `alias` varchar(128) NOT NULL COMMENT '别名',
    `root_name` varchar(128) NOT NULL COMMENT 'root_name',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_tid_field` (`tid`,`field`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '索引存储' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_base_view` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `tid` int(11) DEFAULT NULL COMMENT 'table id',
    `name` varchar(32) NOT NULL COMMENT '视图名称',
    `is_use_default_time` int(11) DEFAULT NULL COMMENT '是否使用系统时间',
    `key` varchar(64) NOT NULL COMMENT '指定时间字段Key名称',
    `format` varchar(64) NOT NULL COMMENT '时间转换格式',
    `sql_view` text COMMENT 'sql_view',
    `uid` int(11) DEFAULT NULL COMMENT '操作人',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_tid_name` (`tid`, `name`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '物化视图管理' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_user` (
    `id` int(11) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `oa_id` bigint(20)  NOT NULL COMMENT 'oa_id',
    `username` varchar(256) NOT NULL COMMENT '用户名',
    `nickname` varchar(256) NOT NULL COMMENT '昵称',
    `secret` varchar(256) NOT NULL COMMENT '实例名称',
    `email` varchar(64) NOT NULL COMMENT 'email',
    `avatar` varchar(256) NOT NULL COMMENT 'avatar',
    `hash` varchar(256) NOT NULL COMMENT 'hash',
    `web_url` varchar(256) NOT NULL COMMENT 'webUrl',
    `oauth` varchar(256) NOT NULL COMMENT 'oauth',
    `state` varchar(256) NOT NULL COMMENT 'state',
    `oauth_id` varchar(256) NOT NULL COMMENT 'oauthId',
    `password` varchar(256) NOT NULL COMMENT 'password',
    `current_authority` varchar(256) NOT NULL COMMENT 'currentAuthority',
    `access` varchar(256) NOT NULL COMMENT 'access',
    `oauth_token` text COMMENT 'oauth_token',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '用户数据存储' DEFAULT CHARSET = utf8mb4;

INSERT INTO mogo_user (`oa_id`, `username`, `nickname`, `secret`, `email`, `avatar`, `hash`,`web_url`, `oauth`, `state`, `oauth_id`, `password`, `current_authority`, `access`, `oauth_token`, `ctime`, `utime`, `dtime`) VALUES ( 0, 'shimo', 'shimo', '', '', '', '', '', '', '', '', '$2a$10$/P5z7e4LIIES48cf/BTvROhOT1AaYU3kGw/Xw3l4nCZecIJ85N1ke', '', 'init', '{}', 1640624435, 1640624435, 0);

CREATE TABLE `mogo_cluster`
(
    `id`                 int(11) unsigned NOT NULL AUTO_INCREMENT,
    `ctime`             int(11) DEFAULT NULL COMMENT '创建时间',
    `utime`             int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime`             int(11) DEFAULT NULL COMMENT '删除时间',
    `name`               varchar(128)     NOT NULL COMMENT 'k8s集群英文唯一标识名',
    `description`        varchar(128) DEFAULT NULL COMMENT '对k8s集群的简要描述',
    `status`             tinyint(1)   DEFAULT NULL COMMENT '集群状态,0:正常, 非0:不正常',
    `api_server`         varchar(255)     NOT NULL COMMENT 'k8s集群的ApiServer地址',
    `kube_config`        mediumtext       NOT NULL COMMENT 'admin权限的kubeconfig文件',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_cluster_name` (`name`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '集群配置' DEFAULT CHARSET = utf8mb4;


-- configuration: table
CREATE TABLE `mogo_k8s_cm`
(
    `id`         int(11) unsigned NOT NULL AUTO_INCREMENT,
    `cluster_id` int(11) DEFAULT NULL COMMENT '集群ID',
    `name`      varchar(128) DEFAULT NULL,
    `namespace` varchar(128) DEFAULT NULL,
    `ctime`     int(11) DEFAULT NULL COMMENT '创建时间',
    `utime`     int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime`     int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_cluster_id_name_namespace` (`cluster_id`,`name`,`namespace`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

-- configuration: table
CREATE TABLE `mogo_configuration`
(
    `id`              int(11) unsigned NOT NULL AUTO_INCREMENT,
    `k8s_cm_id`     int(11) DEFAULT NULL COMMENT 'config map id',
    `name`            varchar(64)      DEFAULT NULL,
    `content`         longtext,
    `format`          varchar(32)      DEFAULT NULL,
    `version`         varchar(64)      DEFAULT NULL,
    `uid`             int(11) unsigned DEFAULT NULL,
    `publish_time`     int(11)         DEFAULT NULL,
    `lock_uid`        int(11) unsigned DEFAULT NULL,
    `lock_at`        int(11)         DEFAULT NULL,
    `ctime`             int(11) DEFAULT NULL COMMENT '创建时间',
    `utime`             int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime`             int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_k8s_cm_id_name` (`k8s_cm_id`,`name`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

-- configuration_history: table
CREATE TABLE `mogo_configuration_history`
(
    `id`               int(11) unsigned NOT NULL AUTO_INCREMENT,
    `uid`              int(11) unsigned DEFAULT NULL,
    `configuration_id` int(11) unsigned DEFAULT NULL,
    `change_log`       longtext,
    `content`          longtext,
    `version`          varchar(64)      DEFAULT NULL,
    `ctime`             int(11) DEFAULT NULL COMMENT '创建时间',
    `utime`             int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime`             int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

-- configuration_publish: table
CREATE TABLE `mogo_configuration_publish`
(
    `id`                       int(11) unsigned NOT NULL AUTO_INCREMENT,
    `uid`                      int(11) unsigned DEFAULT NULL,
    `configuration_id`         int(11) unsigned DEFAULT NULL,
    `configuration_history_id` int(11) unsigned DEFAULT NULL,
    `ctime`             int(11) DEFAULT NULL COMMENT '创建时间',
    `utime`             int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime`             int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;
