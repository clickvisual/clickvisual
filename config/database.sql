-- CREATE DATABASE IF NOT EXISTS clickvisual DEFAULT CHARSET utf8mb4;

USE clickvisual;

-- test.cv_alarm definition
CREATE TABLE IF NOT EXISTS `cv_alarm` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `uid` bigint DEFAULT NULL,
    `uuid` varchar(128) NOT NULL DEFAULT '',
    `name` varchar(128) NOT NULL DEFAULT '',
    `desc` varchar(255) NOT NULL DEFAULT '',
    `interval` int DEFAULT NULL,
    `unit` int DEFAULT NULL,
    `tag` text,
    `channel_ids` varchar(255) NOT NULL DEFAULT '',
    `no_data_op` int DEFAULT NULL,
    `level` int DEFAULT NULL,
    `status` int DEFAULT NULL,
    `duty_officers` varchar(255) DEFAULT NULL,
    `is_disable_resolve` tinyint(1) DEFAULT NULL,
    `view_ddl_s` text,
    `table_ids` varchar(255) NOT NULL DEFAULT '',
    `alert_rules` text,
    `tid` int DEFAULT NULL,
    `alert_rule` text,
    `view` text,
    `view_table_name` varchar(255) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_alarm_channel definition
CREATE TABLE IF NOT EXISTS `cv_alarm_channel` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `name` varchar(128) NOT NULL DEFAULT '',
    `key` text,
    `typ` int DEFAULT NULL,
    `uid` int DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_alarm_condition definition
CREATE TABLE IF NOT EXISTS `cv_alarm_condition` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `alarm_id` int DEFAULT NULL,
    `filter_id` int DEFAULT NULL,
    `set_operator_typ` int NOT NULL DEFAULT 0,
    `set_operator_exp` int NOT NULL DEFAULT 0,
    `cond` int DEFAULT NULL,
    `val_1` int DEFAULT NULL,
    `val_2` int DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_alarm_filter definition
CREATE TABLE IF NOT EXISTS `cv_alarm_filter` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `tid` int DEFAULT NULL,
    `alarm_id` int DEFAULT NULL,
    `when` text,
    `set_operator_typ` int NOT NULL DEFAULT 0,
    `set_operator_exp` varchar(255) NOT NULL DEFAULT '',
    `mode` int DEFAULT NULL,
    `status` int DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_alarm_history definition
CREATE TABLE IF NOT EXISTS `cv_alarm_history` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `alarm_id` int DEFAULT NULL,
    `filter_id` int DEFAULT NULL,
    `filter_status` int DEFAULT NULL,
    `is_pushed` int DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_base_database definition
CREATE TABLE IF NOT EXISTS `cv_base_database` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `iid` bigint DEFAULT NULL,
    `name` varchar(64) NOT NULL DEFAULT '',
    `uid` int DEFAULT NULL,
    `cluster` varchar(128) NOT NULL DEFAULT '',
    `is_create_by_cv` tinyint(1) DEFAULT NULL,
    `desc` varchar(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_iid_name` (`iid`, `name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_base_hidden_field definition
CREATE TABLE IF NOT EXISTS `cv_base_hidden_field` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `tid` int DEFAULT NULL,
    `field` varchar(128) NOT NULL DEFAULT '',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_tid_field` (`tid`, `field`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_base_index definition
CREATE TABLE IF NOT EXISTS `cv_base_index` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `tid` int DEFAULT NULL,
    `field` varchar(64) NOT NULL DEFAULT '',
    `root_name` varchar(64) NOT NULL DEFAULT '',
    `typ` int NOT NULL DEFAULT 0,
    `hash_typ` tinyint(1) DEFAULT NULL,
    `alias` varchar(128) NOT NULL DEFAULT '',
    `kind` tinyint(1) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_tid_field_root` (`tid`, `field`, `root_name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_base_instance definition
CREATE TABLE IF NOT EXISTS `cv_base_instance` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `datasource` varchar(32) NOT NULL DEFAULT '',
    `name` varchar(128) NOT NULL DEFAULT '',
    `dsn` text,
    `desc` varchar(255) DEFAULT NULL,
    `mode` tinyint(1) DEFAULT NULL,
    `replica_status` tinyint(1) DEFAULT NULL,
    `clusters` text,
    `prometheus_target` varchar(128) DEFAULT NULL,
    `rule_store_type` int DEFAULT NULL,
    `file_path` varchar(255) DEFAULT NULL,
    `cluster_id` int DEFAULT NULL,
    `namespace` varchar(128) DEFAULT NULL,
    `configmap` varchar(128) DEFAULT NULL,
    `config_prometheus_operator` text,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_datasource_name` (`datasource`, `name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_base_short_url definition
CREATE TABLE IF NOT EXISTS `cv_base_short_url` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `origin_url` text,
    `s_code` varchar(64) NOT NULL DEFAULT '',
    `call_cnt` int DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_base_table definition
CREATE TABLE IF NOT EXISTS `cv_base_table` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `uid` int DEFAULT NULL,
    `did` bigint DEFAULT NULL,
    `name` varchar(128) NOT NULL DEFAULT '',
    `desc` varchar(255) DEFAULT NULL,
    `trace_table_id` int DEFAULT NULL,
    `typ` int DEFAULT NULL,
    `time_field_type` int NOT NULL DEFAULT '0',
    `create_type` tinyint(1) DEFAULT NULL,
    `days` int DEFAULT NULL,
    `topic` varchar(128) NOT NULL DEFAULT '',
    `brokers` varchar(255) NOT NULL DEFAULT '',
    `consumer_num` int DEFAULT NULL,
    `time_field` varchar(128) NOT NULL DEFAULT '',
    `raw_log_field` varchar(255) DEFAULT NULL,
    `kafka_skip_broken_messages` int DEFAULT NULL,
    `is_kafka_timestamp` tinyint(1) DEFAULT NULL,
    `v3_table_type` int DEFAULT NULL,
    `select_fields` text,
    `any_json` text,
    `sql_data` text,
    `sql_stream` text,
    `sql_view` text,
    `sql_distributed` text,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_did_name` (`did`, `name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_base_table_attach definition
CREATE TABLE IF NOT EXISTS `cv_base_table_attach` (
    `tid` int DEFAULT NULL,
    `sqls` longtext,
    `names` text,
    UNIQUE KEY `uix_tid` (`tid`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_base_view definition
CREATE TABLE IF NOT EXISTS `cv_base_view` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `tid` int DEFAULT NULL,
    `name` varchar(64) NOT NULL DEFAULT '',
    `is_use_default_time` int DEFAULT NULL,
    `key` varchar(64) NOT NULL DEFAULT '',
    `format` varchar(64) NOT NULL DEFAULT '',
    `sql_view` text,
    `uid` int DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_tid_name` (`tid`, `name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_bd_crontab definition
CREATE TABLE IF NOT EXISTS `cv_bd_crontab` (
    `node_id` int DEFAULT NULL,
    `desc` varchar(255) NOT NULL DEFAULT '',
    `duty_uid` int DEFAULT NULL,
    `cron` varchar(255) NOT NULL DEFAULT '',
    `typ` int DEFAULT NULL,
    `status` int DEFAULT NULL,
    `uid` int DEFAULT NULL,
    `args` text,
    `is_retry` tinyint(1) DEFAULT NULL,
    `retry_times` int DEFAULT NULL,
    `retry_interval` int DEFAULT NULL,
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `channel_ids` varchar(255) NOT NULL DEFAULT ''
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_bd_depend definition
CREATE TABLE IF NOT EXISTS `cv_bd_depend` (
    `iid` int DEFAULT NULL,
    `database` varchar(64) NOT NULL DEFAULT '',
    `table` varchar(128) NOT NULL DEFAULT '',
    `engine` varchar(128) NOT NULL DEFAULT '',
    `down_dep_database_table` text,
    `up_dep_database_table` text,
    `rows` bigint NOT NULL DEFAULT '0',
    `bytes` bigint NOT NULL DEFAULT '0',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    UNIQUE KEY `uix_iid_database_table` (`iid`, `database`, `table`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_bd_folder definition
CREATE TABLE IF NOT EXISTS `cv_bd_folder` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `uid` int DEFAULT NULL,
    `iid` int DEFAULT NULL,
    `name` varchar(128) NOT NULL DEFAULT '',
    `desc` varchar(255) NOT NULL DEFAULT '',
    `primary` int DEFAULT NULL,
    `secondary` int DEFAULT NULL,
    `workflow_id` int DEFAULT NULL,
    `parent_id` int DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_bd_node definition
CREATE TABLE IF NOT EXISTS `cv_bd_node` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `uid` int DEFAULT NULL,
    `iid` int DEFAULT NULL,
    `folder_id` int DEFAULT NULL,
    `primary` int DEFAULT NULL,
    `secondary` int DEFAULT NULL,
    `tertiary` int DEFAULT NULL,
    `workflow_id` int DEFAULT NULL,
    `sourceId` int DEFAULT NULL,
    `name` varchar(128) NOT NULL DEFAULT '',
    `desc` varchar(255) NOT NULL DEFAULT '',
    `lock_uid` int unsigned DEFAULT NULL,
    `lock_at` int DEFAULT NULL,
    `status` int DEFAULT NULL,
    `uuid` varchar(128) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_bd_node_content definition
CREATE TABLE IF NOT EXISTS `cv_bd_node_content` (
    `node_id` int DEFAULT NULL,
    `content` longtext,
    `result` longtext,
    `previous_content` longtext,
    `utime` bigint DEFAULT NULL COMMENT 'update time'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_bd_node_history definition
CREATE TABLE IF NOT EXISTS `cv_bd_node_history` (
    `uuid` varchar(128) DEFAULT NULL,
    `node_id` int DEFAULT NULL,
    `content` longtext,
    `uid` int DEFAULT NULL,
    `utime` bigint DEFAULT NULL COMMENT 'update time'
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_bd_node_result definition
CREATE TABLE IF NOT EXISTS `cv_bd_node_result` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `node_id` int DEFAULT NULL,
    `uid` int DEFAULT NULL,
    `cost` bigint DEFAULT NULL,
    `status` int DEFAULT NULL,
    `content` longtext,
    `result` longtext,
    `excel_process` longtext,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_bd_source definition
CREATE TABLE IF NOT EXISTS `cv_bd_source` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `iid` int DEFAULT NULL,
    `name` varchar(128) NOT NULL DEFAULT '',
    `desc` varchar(255) NOT NULL DEFAULT '',
    `url` varchar(255) NOT NULL DEFAULT '',
    `username` varchar(255) NOT NULL DEFAULT '',
    `password` varchar(255) NOT NULL DEFAULT '',
    `typ` int DEFAULT NULL,
    `uid` int DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_bd_workflow definition
CREATE TABLE IF NOT EXISTS `cv_bd_workflow` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `iid` int DEFAULT NULL,
    `name` varchar(128) NOT NULL DEFAULT '',
    `desc` varchar(255) NOT NULL DEFAULT '',
    `uid` int DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_cluster definition
CREATE TABLE IF NOT EXISTS `cv_cluster` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `name` varchar(128) NOT NULL DEFAULT '',
    `description` varchar(128) DEFAULT NULL,
    `status` tinyint(1) DEFAULT NULL,
    `api_server` varchar(255) NOT NULL DEFAULT '',
    `kube_config` mediumtext,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_cluster_name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_collect definition
CREATE TABLE IF NOT EXISTS `cv_collect` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `uid` int DEFAULT NULL,
    `table_id` int DEFAULT NULL,
    `alias` varchar(255) NOT NULL DEFAULT '',
    `statement` text,
    `collect_type` bigint DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_configuration definition
CREATE TABLE IF NOT EXISTS `cv_configuration` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `k8s_cm_id` bigint DEFAULT NULL,
    `name` varchar(255) DEFAULT NULL,
    `content` longtext,
    `format` varchar(32) DEFAULT NULL,
    `version` varchar(64) DEFAULT NULL,
    `uid` int unsigned DEFAULT NULL,
    `publish_time` int DEFAULT NULL,
    `lock_uid` int unsigned DEFAULT NULL,
    `lock_at` bigint unsigned DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_configuration_history definition
CREATE TABLE IF NOT EXISTS `cv_configuration_history` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `uid` int unsigned DEFAULT NULL,
    `configuration_id` bigint DEFAULT NULL,
    `change_log` longtext,
    `content` longtext,
    `version` varchar(64) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_configuration_publish definition
CREATE TABLE IF NOT EXISTS `cv_configuration_publish` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `uid` int unsigned DEFAULT NULL,
    `configuration_id` int unsigned DEFAULT NULL,
    `configuration_history_id` int unsigned DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_event definition
CREATE TABLE IF NOT EXISTS `cv_event` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `source` varchar(64) NOT NULL DEFAULT '' COMMENT '事件来源',
    `user_name` varchar(32) NOT NULL DEFAULT '' COMMENT '操作用户的名字',
    `uid` bigint NOT NULL DEFAULT '0' COMMENT '操作用户的uid',
    `operation` varchar(64) NOT NULL DEFAULT '' COMMENT '操作名',
    `object_type` varchar(64) NOT NULL DEFAULT '' COMMENT '被操作对象的类型(一般为db.Table名)',
    `object_id` bigint NOT NULL DEFAULT '0' COMMENT '被操作对象类型(db.BaseTable)下的具体对象的主键(id)',
    `metadata` text NOT NULL COMMENT '事件内容',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_source` (`source`),
    KEY `idx_operation` (`operation`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_k8s_cm definition
CREATE TABLE IF NOT EXISTS `cv_k8s_cm` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `cluster_id` int DEFAULT NULL,
    `name` varchar(128) DEFAULT NULL,
    `namespace` varchar(64) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_cluster_id_name_namespace` (`cluster_id`, `name`, `namespace`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- test.cv_pms_custom_role definition
CREATE TABLE IF NOT EXISTS `cv_pms_custom_role` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `belong_type` varchar(50) NOT NULL DEFAULT '' COMMENT '所属资源类型,如''app''',
    `refer_id` bigint NOT NULL DEFAULT 0 COMMENT '所属资源类型的对应资源id',
    `role_name` varchar(50) NOT NULL DEFAULT '' COMMENT '所属对应资源的角色名称',
    `description` varchar(255) NOT NULL DEFAULT '' COMMENT '对角色的中文描述',
    `sub_resources` json NOT NULL DEFAULT (JSON_OBJECT()) COMMENT '角色所属refer_id资源的子资源列表',
    `acts` json NOT NULL DEFAULT (JSON_OBJECT()) COMMENT '对资源列表中各资源的actions',
    `updated_by` bigint NOT NULL DEFAULT '0' COMMENT '最近一次对记录做更新的用户id',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_pms_default_role definition
CREATE TABLE IF NOT EXISTS `cv_pms_default_role` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `belong_type` varchar(50) NOT NULL DEFAULT '' COMMENT '所属资源类型,如''app''',
    `role_name` varchar(50) NOT NULL DEFAULT '' COMMENT '所属资源的角色名称',
    `description` varchar(255) NOT NULL DEFAULT '' COMMENT '对角色的中文描述',
    `sub_resources` json NOT NULL DEFAULT (JSON_OBJECT()) COMMENT '角色所属belongType资源下的子资源列表',
    `acts` json NOT NULL DEFAULT (JSON_OBJECT()) COMMENT '对资源列表中各资源的actions',
    `updated_by` int NOT NULL DEFAULT '0' COMMENT '最近一次对记录做更新的用户id',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_pms_role definition
CREATE TABLE IF NOT EXISTS `cv_pms_role` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `name` varchar(64) NOT NULL DEFAULT '' COMMENT '角色英文名,可修改,不唯一',
    `desc` varchar(128) NOT NULL DEFAULT '' COMMENT '角色描述',
    `belong_resource` varchar(32) NOT NULL DEFAULT '' COMMENT '角色所属资源,创建后不可修改,如app',
    `role_type` tinyint NOT NULL DEFAULT '0' COMMENT '角色类型[1:默认角色, 2:自定义角色],创建后不可修改',
    `resource_id` bigint NOT NULL DEFAULT '0' COMMENT '所属资源的id[默认角色该字段为0, 自定义角色不为0],创建后不可修改',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_pms_role_detail definition
CREATE TABLE IF NOT EXISTS `cv_pms_role_detail` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `pms_role_id` bigint NOT NULL DEFAULT 0 COMMENT '所属pmsRole的id',
    `sub_resources` json NOT NULL DEFAULT (JSON_OBJECT()) COMMENT '授权目标资源的子资源列表',
    `acts` json NOT NULL DEFAULT (JSON_OBJECT()) COMMENT '准许动作列表',
    `rule_tpl` text NOT NULL COMMENT '规则模板,用于生成casbin中的p类型规则',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_pms_role_ref definition
CREATE TABLE IF NOT EXISTS `cv_pms_role_ref` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `pms_role_id` bigint NOT NULL DEFAULT 0 COMMENT '已存在的角色(pms_role)的Id',
    `ref_id` bigint NOT NULL DEFAULT 0 COMMENT '角色belongResource类型对象的id',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_role_ref` (`pms_role_id`, `ref_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_pms_role_ref_grant definition
CREATE TABLE IF NOT EXISTS `cv_pms_role_ref_grant` (
    `id` bigint NOT NULL AUTO_INCREMENT,
    `pms_role_ref_id` bigint NOT NULL DEFAULT 0 COMMENT '所关联pms_role_ref的Id',
    `ptype` varchar(8) NOT NULL DEFAULT '' COMMENT '所使用的casbin group规则类型.[g, g2, g3]',
    `object_type` varchar(128) NOT NULL DEFAULT '' COMMENT '被授权对象的类型.如user等',
    `object_id` bigint NOT NULL DEFAULT 0 COMMENT '被授权对象的id',
    `domain_type` varchar(64) NOT NULL DEFAULT '' COMMENT '授权所在domain的类型.如, env, ent等',
    `domain_id` bigint NOT NULL DEFAULT '0' COMMENT 'domain_type不为空时,对应domain类型对象的id',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_ref_obj_domain` (
        `pms_role_ref_id`,
        `object_type`,
        `object_id`,
        `domain_type`,
        `domain_id`
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_user definition
CREATE TABLE IF NOT EXISTS `cv_user` (
    `id` bigint NOT NULL AUTO_INCREMENT COMMENT '自增id',
    `ctime` bigint DEFAULT NULL COMMENT '创建时间',
    `utime` bigint DEFAULT NULL COMMENT '更新时间',
    `dtime` bigint unsigned DEFAULT NULL COMMENT '删除时间',
    `oa_id` bigint NOT NULL DEFAULT 0,
    `username` varchar(128) NOT NULL DEFAULT '',
    `nickname` varchar(128) NOT NULL DEFAULT '',
    `secret` varchar(256) NOT NULL DEFAULT '',
    `phone` varchar(64) NOT NULL DEFAULT '',
    `email` varchar(64) NOT NULL DEFAULT '',
    `avatar` varchar(256) NOT NULL DEFAULT '',
    `hash` varchar(256) NOT NULL DEFAULT '',
    `web_url` varchar(256) NOT NULL DEFAULT '',
    `oauth` varchar(256) NOT NULL DEFAULT '',
    `state` varchar(256) NOT NULL DEFAULT '',
    `oauth_id` varchar(256) NOT NULL DEFAULT '',
    `password` varchar(256) NOT NULL DEFAULT '',
    `current_authority` varchar(256) NOT NULL DEFAULT '',
    `access` varchar(256) NOT NULL DEFAULT '',
    `oauth_token` text DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uix_user` (`username`, `nickname`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
-- test.cv_pms_casbin_rule definition
CREATE TABLE IF NOT EXISTS `cv_pms_casbin_rule` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `ptype` varchar(100) DEFAULT NULL,
    `v0` varchar(100) DEFAULT NULL,
    `v1` varchar(100) DEFAULT NULL,
    `v2` varchar(100) DEFAULT NULL,
    `v3` varchar(100) DEFAULT NULL,
    `v4` varchar(100) DEFAULT NULL,
    `v5` varchar(100) DEFAULT NULL,
    `v6` varchar(25) DEFAULT NULL,
    `v7` varchar(25) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_cv_pms_casbin_rule` (
        `ptype`,
        `v0`,
        `v1`,
        `v2`,
        `v3`,
        `v4`,
        `v5`,
        `v6`,
        `v7`
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

INSERT INTO cv_user (`id`,`oa_id`,`username`,`nickname`,`secret`,`phone`,`email`,`avatar`,`hash`,`web_url`,`oauth`,`state`,`oauth_id`,`password`,`current_authority`,`access`,`oauth_token`,`ctime`,`utime`,`dtime` ) VALUES (1,0,'clickvisual','clickvisual','','','','','','','','','','$2a$10$mj/hP5ToyVYZsyH2.84sr.nXPT.c2iTenx6euMHZQhNQlGXFJlDBa','','init','{}',1640624435,1640624435,0);

INSERT INTO `cv_pms_casbin_rule` VALUES (1,'p','role__root','*','*','*','','','','');

INSERT INTO `cv_pms_casbin_rule` VALUES (2,'g3','user__1','role__root','','','','','','');