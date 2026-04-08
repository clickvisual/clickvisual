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
  `source_time_field` varchar(128) NOT NULL,
  `target_table` varchar(128) NOT NULL,
  `mv_name` varchar(128) NOT NULL,
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
