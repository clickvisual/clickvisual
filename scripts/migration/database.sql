CREATE DATABASE IF NOT EXISTS clickvisual DEFAULT CHARSET utf8mb4;
USE clickvisual;

CREATE TABLE IF NOT EXISTS `cv_report` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `name` varchar(128) NOT NULL,
  `desc` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'enabled',
  `query_mode` varchar(32) NOT NULL DEFAULT 'sql',
  `query_text` text,
  `builder_config` longtext,
  `template_key` varchar(128) NOT NULL,
  `output_format` varchar(32) NOT NULL DEFAULT 'markdown',
  `duty_uid` int(11) DEFAULT 0,
  `creator_uid` int(11) DEFAULT 0,
  `ctime` bigint DEFAULT NULL COMMENT '创建时间',
  `utime` bigint DEFAULT NULL COMMENT '更新时间',
  `dtime` bigint DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_report_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_report_schedule` (
  `report_id` int(11) NOT NULL,
  `cron` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'enabled',
  `channel_ids` text NOT NULL COMMENT 'JSON text array of cv_alarm_channel.id',
  `is_retry` tinyint(1) NOT NULL DEFAULT 0,
  `retry_times` int(11) NOT NULL DEFAULT 0,
  `retry_interval` int(11) NOT NULL DEFAULT 0,
  `last_run_at` bigint DEFAULT NULL,
  `next_run_at` bigint DEFAULT NULL,
  `ctime` bigint DEFAULT NULL COMMENT '创建时间',
  `utime` bigint DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`report_id`),
  KEY `idx_report_schedule_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_report_execution` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `report_id` int(11) NOT NULL,
  `trigger` varchar(32) NOT NULL,
  `status` varchar(32) NOT NULL,
  `started_at` bigint NOT NULL,
  `ended_at` bigint DEFAULT NULL,
  `duration_seconds` int(11) NOT NULL DEFAULT 0,
  `operator_name` varchar(64) NOT NULL,
  `error_message` text,
  `channel_results` longtext COMMENT 'JSON text of per-channel send results',
  `rendered_title` varchar(255) NOT NULL,
  `rendered_content` longtext,
  `ctime` bigint DEFAULT NULL COMMENT '创建时间',
  `utime` bigint DEFAULT NULL COMMENT '更新时间',
  `dtime` bigint DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_report_execution_report_id` (`report_id`),
  KEY `idx_report_execution_trigger` (`trigger`),
  KEY `idx_report_execution_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_report_acceleration` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `report_id` int(11) NOT NULL,
  `instance_id` int(11) NOT NULL DEFAULT 0,
  `source_database` varchar(128) NOT NULL,
  `source_table` varchar(128) NOT NULL,
  `source_local_table` varchar(128) DEFAULT NULL,
  `source_time_field` varchar(128) NOT NULL,
  `target_table` varchar(128) NOT NULL,
  `target_local_table` varchar(128) DEFAULT NULL,
  `mv_name` text,
  `cluster_name` varchar(128) DEFAULT NULL,
  `filter_sql` longtext,
  `builder_fingerprint` varchar(64) NOT NULL,
  `backfill_start_at` bigint DEFAULT NULL,
  `backfill_end_at` bigint DEFAULT NULL,
  `ddl_sql` longtext,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `error_message` text,
  `ctime` bigint DEFAULT NULL COMMENT '创建时间',
  `utime` bigint DEFAULT NULL COMMENT '更新时间',
  `dtime` bigint DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_report_acceleration_report_id` (`report_id`),
  KEY `idx_report_acceleration_fingerprint` (`builder_fingerprint`),
  KEY `idx_report_acceleration_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_query_filter_profile` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `name` varchar(128) NOT NULL,
  `instance_id` int(11) NOT NULL,
  `instance_name` varchar(255) NOT NULL,
  `database_name` varchar(255) NOT NULL,
  `table_name` varchar(255) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `conditions_json` json NOT NULL,
  `creator` varchar(128) NOT NULL,
  `updater` varchar(128) NOT NULL,
  `ctime` bigint DEFAULT NULL COMMENT '创建时间',
  `utime` bigint DEFAULT NULL COMMENT '更新时间',
  `dtime` bigint DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_query_filter_scope` (`instance_id`,`database_name`,`table_name`),
  KEY `idx_query_filter_creator_name` (`creator`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_ai_setting` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `base_url` varchar(255) NOT NULL DEFAULT '',
  `api_key_encrypted` text,
  `model` varchar(128) NOT NULL DEFAULT '',
  `timeout_seconds` int(11) NOT NULL DEFAULT 5,
  `max_input_bytes` int(11) NOT NULL DEFAULT 32768,
  `default_temperature` decimal(4,2) NOT NULL DEFAULT 0.20,
  `default_max_tokens` int(11) NOT NULL DEFAULT 800,
  `providers_imported` tinyint(1) NOT NULL DEFAULT 0,
  `creator_uid` int(11) NOT NULL DEFAULT 0,
  `updater_uid` int(11) NOT NULL DEFAULT 0,
  `ctime` bigint DEFAULT NULL COMMENT '创建时间',
  `utime` bigint DEFAULT NULL COMMENT '更新时间',
  `dtime` bigint DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_ai_provider` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `provider_key` varchar(32) NOT NULL DEFAULT '',
  `name` varchar(64) NOT NULL DEFAULT '',
  `kind` varchar(16) NOT NULL DEFAULT 'openai',
  `base_url` varchar(255) NOT NULL DEFAULT '',
  `model` varchar(128) NOT NULL DEFAULT '',
  `reasoning_effort` varchar(16) NOT NULL DEFAULT '',
  `api_key_encrypted` text,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `sort` int(11) NOT NULL DEFAULT 0,
  `creator_uid` int(11) NOT NULL DEFAULT 0,
  `updater_uid` int(11) NOT NULL DEFAULT 0,
  `ctime` bigint DEFAULT NULL COMMENT '创建时间',
  `utime` bigint DEFAULT NULL COMMENT '更新时间',
  `dtime` bigint DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_troubleshoot_session` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `uid` int(11) NOT NULL DEFAULT 0,
  `title` varchar(64) NOT NULL DEFAULT '',
  `status` varchar(32) NOT NULL DEFAULT 'idle',
  `share_token` varchar(64) NOT NULL DEFAULT '',
  `last_tid` int(11) NOT NULL DEFAULT 0,
  `last_window` bigint NOT NULL DEFAULT 0,
  `source` varchar(32) NOT NULL DEFAULT '',
  `pending` text,
  `ctime` bigint DEFAULT NULL COMMENT '创建时间',
  `utime` bigint DEFAULT NULL COMMENT '更新时间',
  `dtime` bigint DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_troubleshoot_session_uid` (`uid`),
  KEY `idx_troubleshoot_session_share` (`share_token`),
  KEY `idx_cv_troubleshoot_session_source` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_alarm_ai_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fingerprint` varchar(64) NOT NULL,
  `version` bigint NOT NULL DEFAULT 0,
  `starts_at` bigint NOT NULL DEFAULT 0,
  `resolved_at` bigint NOT NULL DEFAULT 0,
  `last_success_at` bigint NOT NULL DEFAULT 0,
  `job_id` int NOT NULL DEFAULT 0,
  `ctime` bigint DEFAULT NULL,
  `utime` bigint DEFAULT NULL,
  `dtime` bigint DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uidx_alarm_ai_fingerprint` (`fingerprint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_alarm_ai_analysis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `token` varchar(64) NOT NULL,
  `alarm_id` int NOT NULL,
  `filter_id` int NOT NULL,
  `uid` int NOT NULL,
  `tid` int NOT NULL,
  `starts_at` bigint NOT NULL DEFAULT 0,
  `window_start` bigint NOT NULL DEFAULT 0,
  `window_end` bigint NOT NULL DEFAULT 0,
  `title` varchar(255) NOT NULL DEFAULT '',
  `description` text,
  `query` text,
  `channel_ids` text,
  `cooldown_seconds` int NOT NULL DEFAULT 900,
  `event_count` int NOT NULL DEFAULT 1,
  `status` varchar(16) NOT NULL DEFAULT 'queued',
  `attempts` int NOT NULL DEFAULT 0,
  `next_attempt_at` bigint NOT NULL DEFAULT 0,
  `lease_owner` varchar(64) NOT NULL DEFAULT '',
  `lease_until` bigint NOT NULL DEFAULT 0,
  `summary` text,
  `snapshot` longtext,
  `ctime` bigint DEFAULT NULL,
  `utime` bigint DEFAULT NULL,
  `dtime` bigint DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uidx_alarm_ai_token` (`token`),
  KEY `idx_alarm_ai_group` (`group_id`),
  KEY `idx_alarm_ai_due` (`status`, `next_attempt_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_alarm_ai_delivery` (
  `id` int NOT NULL AUTO_INCREMENT,
  `analysis_id` int NOT NULL,
  `channel_id` int NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT 0,
  `lease_owner` varchar(64) NOT NULL DEFAULT '',
  `lease_until` bigint NOT NULL DEFAULT 0,
  `ctime` bigint DEFAULT NULL,
  `utime` bigint DEFAULT NULL,
  `dtime` bigint DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uidx_alarm_ai_delivery` (`analysis_id`, `channel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_alarm_ai_fork` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uid` int NOT NULL,
  `request_id` varchar(64) NOT NULL,
  `analysis_id` int NOT NULL,
  `session_id` int NOT NULL DEFAULT 0,
  `ctime` bigint DEFAULT NULL,
  `utime` bigint DEFAULT NULL,
  `dtime` bigint DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_alarm_ai_fork_request` (`uid`, `request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cv_troubleshoot_message` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `session_id` int(11) NOT NULL DEFAULT 0,
  `role` varchar(16) NOT NULL DEFAULT '',
  `kind` varchar(16) NOT NULL DEFAULT '',
  `content` text,
  `payload` text,
  `ctime` bigint DEFAULT NULL COMMENT '创建时间',
  `utime` bigint DEFAULT NULL COMMENT '更新时间',
  `dtime` bigint DEFAULT 0 COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_troubleshoot_message_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
