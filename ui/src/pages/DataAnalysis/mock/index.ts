export const TemporarySQL =
  "CREATE TABLE IF NOT EXISTS track_events \n" +
  "(\n" +
  "    event_id STRING COMMENT 'event id'\n" +
  "    ,event_type STRING COMMENT '事件类型'\n" +
  "    ,device_id STRING COMMENT 'device id'\n" +
  "    ,app_channel STRING COMMENT 'app channel'\n" +
  "    ,user_id STRING COMMENT 'user id'\n" +
  "    ,ts BIGINT COMMENT 'timestamp'\n" +
  "    ,activation_state STRING COMMENT '激活状态'\n" +
  "    ,app_dev_code STRING\n" +
  "    ,msg STRING\n" +
  "    ,activation_info STRING\n" +
  "    ,app_version STRING\n" +
  "    ,os_version STRING\n" +
  "    ,os_platform STRING\n" +
  "    ,shimo_device_id STRING COMMENT 'shimo_ 开头废弃'\n" +
  "    ,ipaddr STRING\n" +
  "    ,os_arch STRING\n" +
  "    ,os_release STRING\n" +
  "    ,s_is_first_day STRING\n" +
  "    ,s_latest_search_keyword STRING\n" +
  "    ,s_screen_width STRING\n" +
  "    ,ops_successed STRING\n" +
  "    ,ops_name STRING\n" +
  "    ,s_screen_height STRING\n" +
  "    ,s_url STRING\n" +
  "    ,s_url_path STRING\n" +
  "    ,s_referrer STRING\n" +
  "    ,s_referrer_host STRING\n" +
  "    ,module_name STRING\n" +
  "    ,s_lib STRING\n" +
  "    ,s_lib_version STRING\n" +
  "    ,s_lib_method STRING\n" +
  "    ,s_title STRING\n" +
  "    ,user_agent STRING\n" +
  "    ,s_latest_traffic_source_type STRING\n" +
  "    ,distinct_id STRING\n" +
  "    ,lv STRING\n" +
  "    ,message STRING\n" +
  "    ,message_id STRING\n" +
  "    ,s_latest_referrer STRING\n" +
  "    ,s_latest_referrer_host STRING\n" +
  "    ,longitude STRING\n" +
  "    ,province STRING\n" +
  "    ,latitude STRING\n" +
  "    ,city STRING\n" +
  "    ,country STRING\n" +
  "    ,ext STRING COMMENT '自定义扩展字段'\n" +
  "    ,page_id STRING COMMENT 'page id'\n" +
  "    ,team_id STRING COMMENT 'team_id'\n" +
  "    ,category STRING\n" +
  "    ,disitnct_id STRING\n" +
  "    ,ev STRING\n" +
  "    ,file_id STRING\n" +
  "    ,file_name STRING\n" +
  "    ,file_type STRING\n" +
  "    ,group_id STRING\n" +
  "    ,guid STRING\n" +
  "    ,is_expired STRING\n" +
  "    ,is_official STRING\n" +
  "    ,os STRING\n" +
  "    ,pos STRING\n" +
  "    ,redeem_code_provider STRING\n" +
  "    ,reg_time STRING\n" +
  "    ,s_app_version STRING\n" +
  "    ,s_element_name STRING\n" +
  "    ,s_latest_landing_page STRING\n" +
  "    ,s_url_query STRING\n" +
  "    ,s_utm_campaign STRING\n" +
  "    ,s_utm_content STRING\n" +
  "    ,s_utm_matching_type STRING\n" +
  "    ,s_utm_medium STRING\n" +
  "    ,s_utm_source STRING\n" +
  "    ,share_mode STRING\n" +
  "    ,shimo_user_id STRING COMMENT 'shimo_ 开头废弃'\n" +
  "    ,source STRING\n" +
  "    ,status STRING\n" +
  "    ,sub_type STRING\n" +
  "    ,team_time STRING\n" +
  "    ,test_id STRING\n" +
  "    ,udid STRING COMMENT 'udid 新设备id'\n" +
  "    ,annymous_user STRING\n" +
  "    ,ipaddr_xff STRING COMMENT 'ipaddr_xff'\n" +
  "    ,from_host STRING COMMENT '埋点域名'\n" +
  "    ,active_source STRING\n" +
  "    ,sub_active_source STRING\n" +
  "    ,button_name STRING COMMENT '按钮展示名称'\n" +
  "    ,account_type STRING COMMENT '账户类型，方便前端直接传。enterprise_standard=企业版；enterprise_expired=企业版已到期；enterprise_light=团队版； enterprise_light_expired=团队版已到期；enterprise_dingding=钉钉版；dingding_expired 钉钉版已到期 personal_premium=个人高级版 ；personal_free=个人免费版'\n" +
  "    ,fp STRING COMMENT 'js fingerprint'\n" +
  "    ,cdid STRING COMMENT 'client did'\n" +
  ")\n" +
  "COMMENT '新埋点'\n" +
  "PARTITIONED BY \n" +
  "(\n" +
  "    ldate STRING\n" +
  ")\n" +
  ";\n";
