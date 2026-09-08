import type { OverviewSummary } from "../../src/domains/overview/types/contracts";

export function buildOverviewSummaryMock(): OverviewSummary {
  return {
    generatedAt: 1788861600,
    ingestion: {
      instanceCount: 1,
      databaseCount: 1,
      tableCount: 2,
      newTablesLast7Days: 1,
      createTypes: [
        { createType: 2, label: "JSONEachRow", count: 1 },
        { createType: 1, label: "接入已有表", count: 1 }
      ],
      totalRows: 123456,
      totalBytes: 5 * 1024 * 1024,
      volumeUnavailableInstances: [],
      topTables: [
        {
          tableId: 9527,
          instanceId: 1,
          instanceName: "生产 ClickHouse",
          databaseName: "default",
          tableName: "logs",
          createType: 2,
          ctime: 1788000000,
          totalRows: 120000,
          totalBytes: 4 * 1024 * 1024
        },
        {
          tableId: 9528,
          instanceId: 1,
          instanceName: "生产 ClickHouse",
          databaseName: "default",
          tableName: "app_logs",
          createType: 1,
          ctime: 1788800000,
          totalRows: 3456,
          totalBytes: 1024 * 1024
        }
      ],
      recentTables: [
        {
          tableId: 9528,
          instanceId: 1,
          instanceName: "生产 ClickHouse",
          databaseName: "default",
          tableName: "app_logs",
          createType: 1,
          ctime: 1788800000
        },
        {
          tableId: 9527,
          instanceId: 1,
          instanceName: "生产 ClickHouse",
          databaseName: "default",
          tableName: "logs",
          createType: 2,
          ctime: 1788000000
        }
      ]
    },
    alarm: {
      total: 5,
      normal: 3,
      firing: 1,
      closed: 1,
      ruleCheck: 0,
      levelAlarm: 2,
      levelNotice: 2,
      levelSerious: 1,
      todayCount: 2,
      last7DayCount: 9,
      pushSuccess: 8,
      pushFail: 1,
      pushRepeat: 0,
      dailyTrend: [
        { date: "09-02", count: 1 },
        { date: "09-03", count: 0 },
        { date: "09-04", count: 2 },
        { date: "09-05", count: 1 },
        { date: "09-06", count: 3 },
        { date: "09-07", count: 0 },
        { date: "09-08", count: 2 }
      ],
      recentFiring: [{ id: 7, name: "gateway 5xx 突增", status: 3, level: 2, utime: 1788861000 }]
    },
    report: {
      total: 2,
      enabled: 1,
      disabled: 1,
      scheduleTotal: 2,
      scheduleEnabled: 1,
      todayExecutions: 3,
      todaySuccess: 2,
      todayFailed: 1,
      todayPartial: 0,
      running: 0,
      recentExecutions: [
        {
          id: 501,
          reportId: 1001,
          reportName: "日报-核心指标概览",
          status: "success",
          trigger: "schedule",
          startedAt: 1788858000,
          durationSeconds: 3
        },
        {
          id: 500,
          reportId: 1002,
          reportName: "周报-错误汇总",
          status: "failed",
          trigger: "manual",
          startedAt: 1788850000,
          durationSeconds: 1
        }
      ],
      recentReports: [
        { id: 1001, name: "日报-核心指标概览", status: "enabled", utime: 1788858000 },
        { id: 1002, name: "周报-错误汇总", status: "disabled", utime: 1788700000 }
      ]
    }
  };
}
