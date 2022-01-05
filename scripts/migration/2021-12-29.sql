CREATE DATABASE mocro DEFAULT CHARSET utf8mb4;
USE mocro;

CREATE TABLE `mogo_instance` (
    `id` bigint(20) AUTO_INCREMENT NOT NULL COMMENT 'id',
    `datasource` varchar(32) NOT NULL COMMENT '数据源类型',
    `name` varchar(128) NOT NULL COMMENT '实例名称',
    `dsn` text COMMENT 'dsn',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_datasource_name` (`datasource`,`name`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '服务配置存储' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_user` (
    `id` bigint(20) AUTO_INCREMENT NOT NULL COMMENT 'id',
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


CREATE TABLE `mogo_index` (
    `instance_id` bigint(20) NOT NULL COMMENT '实例ID',
    `database` varchar(32) NOT NULL COMMENT '数据库',
    `table` varchar(64) NOT NULL COMMENT '表',
    `field` varchar(128) NOT NULL COMMENT '字段',
    `typ` int(11) NOT NULL COMMENT '字段 0 text 1 long 2 double 3 json',
    `alias` varchar(128) NOT NULL COMMENT '别名',
    `ctime` int(11) DEFAULT NULL COMMENT '创建时间',
    `utime` int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime` int(11) DEFAULT NULL COMMENT '删除时间',
    UNIQUE KEY `uix_instance_database_table_field` (`instance_id`,`database`,`table`,`field`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 COMMENT '索引存储' DEFAULT CHARSET = utf8mb4;

CREATE TABLE `mogo_cluster`
(
    `id`                 int(11) unsigned NOT NULL AUTO_INCREMENT,
    `ctime`             int(11) DEFAULT NULL COMMENT '创建时间',
    `utime`             int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime`             int(11) DEFAULT NULL COMMENT '删除时间',
    `name`               varchar(255)     NOT NULL COMMENT 'k8s集群英文唯一标识名',
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
    PRIMARY KEY (`id`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

-- configuration: table
CREATE TABLE `mogo_configuration`
(
    `id`              int(11) unsigned NOT NULL AUTO_INCREMENT,
    `k8s_cm_id`     int(11) DEFAULT NULL COMMENT 'config map id',
    `k8s_cm_name`      varchar(128) DEFAULT NULL,
    `k8s_cm_namespace` varchar(128) DEFAULT NULL,
    `name`            varchar(64)      DEFAULT NULL,
    `content`         longtext,
    `format`          varchar(32)      DEFAULT NULL,
    `version`         varchar(64)      DEFAULT NULL,
    `uid`             int(11) unsigned DEFAULT NULL,
    `publish_time`     int(11)         DEFAULT NULL,
    `lock_uid`        int(11) unsigned DEFAULT NULL,
    `lock_at`         datetime         DEFAULT NULL,
    `ctime`             int(11) DEFAULT NULL COMMENT '创建时间',
    `utime`             int(11) DEFAULT NULL COMMENT '更新时间',
    `dtime`             int(11) DEFAULT NULL COMMENT '删除时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_k8s_cm_id_name` (`cm_name`)
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
