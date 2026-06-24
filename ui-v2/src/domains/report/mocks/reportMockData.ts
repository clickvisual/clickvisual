import type {
  ReportAccelerationStatus,
  ReportEditorDraft,
  ReportExecutionPreview,
  ReportExecutionRecord,
  ReportListItem,
  ReportPushChannel,
  ReportScheduleRuntime,
  ReportScheduleConfig,
  ReportSendResultSummary,
  ReportWorkspace
} from "../types/contracts";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const seedReportListMock: ReportListItem[] = [
  {
    id: 1001,
    nodeId: 31001,
    name: "日报-核心指标概览",
    desc: "每天 09:00 推送核心业务指标",
    status: "enabled",
    dutyUid: 10086,
    updatedAt: "2026-03-28T09:02:00+08:00"
  },
  {
    id: 1002,
    nodeId: 31002,
    name: "周报-异常波动追踪",
    desc: "每周一 10:00 推送上周异常波动",
    status: "paused",
    dutyUid: 10010,
    updatedAt: "2026-03-25T11:20:00+08:00"
  }
];

const seedReportScheduleMockById: Record<number, ReportScheduleConfig> = {
  1001: {
    reportId: 1001,
    desc: "核心指标日报任务",
    dutyUid: 10086,
    cron: "0 0 9 * * *",
    typ: 0,
    args: [
      { key: "timezone", val: "Asia/Shanghai" },
      { key: "template", val: "daily-core-kpi" }
    ],
    isRetry: 1,
    retryTimes: 2,
    retryInterval: 300,
    channelIds: [201]
  },
  1002: {
    reportId: 1002,
    desc: "异常波动周报任务",
    dutyUid: 10010,
    cron: "0 0 10 * * 1",
    typ: 1,
    args: [{ key: "template", val: "weekly-anomaly" }],
    isRetry: 0,
    retryTimes: 0,
    retryInterval: 0,
    channelIds: [201]
  }
};

const seedReportEditorDraftMockById: Record<number, ReportEditorDraft> = {
  1001: {
    reportId: 1001,
    nodeId: 31001,
    name: "日报-核心指标概览",
    desc: "按天汇总核心服务请求量、错误率与延迟分位。",
    queryMode: "sql",
    queryText:
      "SELECT service, count() AS requests, quantile(0.95)(latency) AS p95 FROM logs WHERE env = 'prod' GROUP BY service",
    templateKey: "daily-core-kpi",
    outputFormat: "markdown",
    recipientChannelIds: [201],
    builder: {
      instanceId: 1,
      database: "dev_log",
      table: "app_stdout",
      timeField: "time",
      timeRange: "1d",
      where: "env = 'prod'",
      metrics: [
        { key: "count", label: "总量" },
        { key: "custom", label: "P95 延迟", expression: "quantile(0.95)(latency)" }
      ]
    }
  },
  1002: {
    reportId: 1002,
    nodeId: 31002,
    name: "周报-异常波动追踪",
    desc: "聚合近 7 天异常峰值，并定位影响最大的服务。",
    queryMode: "dsl",
    queryText: "service:* AND level:error | stats count() by service, error_code",
    templateKey: "weekly-anomaly",
    outputFormat: "image",
    recipientChannelIds: [201],
    builder: null
  }
};

const seedReportChannelsMock: ReportPushChannel[] = [
  {
    id: 201,
    key: "ops-dingtalk",
    name: "运维钉钉群",
    typ: "dingtalk",
    enabled: true,
    token: "mock-dingtalk-token",
    webhook: "https://oapi.dingtalk.com/robot/send?access_token=mock"
  }
];

const seedReportExecutionPreviewMockById: Record<number, ReportExecutionPreview> =
  {
    1001: {
      reportId: 1001,
      canRun: true,
      nextRunAt: "2026-03-31T09:00:00+08:00",
      lastRunAt: "2026-03-30T09:00:06+08:00",
      message: "最近一次执行成功，可手动预览。"
    },
    1002: {
      reportId: 1002,
      canRun: false,
      nextRunAt: "2026-04-06T10:00:00+08:00",
      lastRunAt: "2026-03-24T10:00:12+08:00",
      message: "任务暂停中，恢复后可执行预览。"
    }
  };

const seedReportRecentExecutionsMockById: Record<number, ReportExecutionRecord[]> =
  {
    1001: [
      {
        id: 50001,
        reportId: 1001,
        status: "success",
        trigger: "schedule",
        startedAt: "2026-03-30T09:00:00+08:00",
        endedAt: "2026-03-30T09:00:06+08:00",
        durationSeconds: 6,
        operatorName: "system",
        channelResults: [
          {
            channelId: 201,
            channelTyp: "dingtalk",
            success: 1,
            failed: 0,
            lastSentAt: "2026-03-30T09:00:06+08:00"
          }
        ]
      },
      {
        id: 50002,
        reportId: 1001,
        status: "failed",
        trigger: "manual",
        startedAt: "2026-03-29T15:10:00+08:00",
        endedAt: "2026-03-29T15:10:12+08:00",
        durationSeconds: 12,
        operatorName: "张三",
        errorMessage: "发送阶段失败: 钉钉 webhook 返回 HTTP 500",
        channelResults: [
          {
            channelId: 201,
            channelTyp: "dingtalk",
            success: 0,
            failed: 1,
            lastSentAt: "2026-03-29T15:10:12+08:00",
            attempts: 2,
            retried: 1,
            retryTimes: 1,
            retryInterval: 3,
            errors: ["attempt 1/2: timeout", "attempt 2/2: HTTP 500"]
          }
        ]
      }
    ],
    1002: [
      {
        id: 50003,
        reportId: 1002,
        status: "unknown",
        trigger: "schedule",
        startedAt: "2026-03-24T10:00:00+08:00",
        endedAt: "2026-03-24T10:00:12+08:00",
        durationSeconds: 12,
        operatorName: "system",
        channelResults: []
      }
    ]
  };

const seedReportSendSummaryMockById: Record<number, ReportSendResultSummary> = {
  1001: {
    reportId: 1001,
    total: 5,
    success: 4,
    failed: 1,
    channels: [
      {
        channelId: 201,
        channelTyp: "dingtalk",
        success: 4,
        failed: 1,
        lastSentAt: "2026-03-30T09:00:08+08:00"
      }
    ]
  },
  1002: {
    reportId: 1002,
    total: 1,
    success: 1,
    failed: 0,
    channels: [
      {
        channelId: 201,
        channelTyp: "dingtalk",
        success: 1,
        failed: 0,
        lastSentAt: "2026-03-24T10:00:15+08:00"
      }
    ]
  }
};

const seedReportScheduleRuntimeMockById: Record<number, ReportScheduleRuntime> = {
  1001: {
    registered: true,
    paused: false,
    nextRunAt: "2026-03-31T09:00:00+08:00",
    lastScheduledExecution: {
      status: "success",
      trigger: "schedule",
      startedAt: "2026-03-30T09:00:00+08:00",
      endedAt: "2026-03-30T09:00:06+08:00",
      operatorName: "system"
    }
  },
  1002: {
    registered: false,
    paused: true,
    nextRunAt: "",
    lastScheduledExecution: {
      status: "unknown",
      trigger: "schedule",
      startedAt: "2026-03-24T10:00:00+08:00",
      endedAt: "2026-03-24T10:00:12+08:00",
      operatorName: "system"
    }
  }
};

const seedReportAccelerationMockById: Record<number, ReportAccelerationStatus> = {
  1001: {
    status: "ready",
    targetTable: "dev_log.cv_report_agg_1001",
    mvName: "dev_log.cv_report_mv_1001"
  },
  1002: {
    status: "missing",
    targetTable: "",
    mvName: ""
  }
};

export const reportListMock = clone(seedReportListMock);
export const reportScheduleMockById = clone(seedReportScheduleMockById);
export const reportEditorDraftMockById = clone(seedReportEditorDraftMockById);
export const reportChannelsMock = clone(seedReportChannelsMock);
export const reportExecutionPreviewMockById = clone(
  seedReportExecutionPreviewMockById
);
export const reportRecentExecutionsMockById = clone(
  seedReportRecentExecutionsMockById
);
export const reportSendSummaryMockById = clone(seedReportSendSummaryMockById);
export const reportScheduleRuntimeMockById = clone(
  seedReportScheduleRuntimeMockById
);
export const reportAccelerationMockById = clone(seedReportAccelerationMockById);

export function resetReportMockStore() {
  reportListMock.splice(0, reportListMock.length, ...clone(seedReportListMock));

  replaceRecord(reportScheduleMockById, seedReportScheduleMockById);
  replaceRecord(reportEditorDraftMockById, seedReportEditorDraftMockById);
  reportChannelsMock.splice(
    0,
    reportChannelsMock.length,
    ...clone(seedReportChannelsMock)
  );
  replaceRecord(
    reportExecutionPreviewMockById,
    seedReportExecutionPreviewMockById
  );
  replaceRecord(
    reportRecentExecutionsMockById,
    seedReportRecentExecutionsMockById
  );
  replaceRecord(reportSendSummaryMockById, seedReportSendSummaryMockById);
  replaceRecord(reportScheduleRuntimeMockById, seedReportScheduleRuntimeMockById);
  replaceRecord(reportAccelerationMockById, seedReportAccelerationMockById);
}

export function buildReportWorkspaceMock(reportId = 1001): ReportWorkspace {
  const active =
    reportListMock.find((item) => item.id === reportId) ?? reportListMock[0];

  if (!active) {
    return {
      activeReportId: 0,
      list: [],
      editor: {
        reportId: 0,
        nodeId: 0,
        name: "",
        desc: "",
        queryMode: "sql",
        queryText: "",
        templateKey: "",
        outputFormat: "markdown",
        recipientChannelIds: [],
        builder: null
      },
      schedule: {
        reportId: 0,
        desc: "",
        dutyUid: 0,
        cron: "",
        typ: 0,
        args: [],
        isRetry: 0,
        retryTimes: 0,
        retryInterval: 0,
        channelIds: []
      },
      preview: {
        reportId: 0,
        canRun: false,
        nextRunAt: "",
        lastRunAt: "",
        message: ""
      },
      executions: [],
      delivery: {
        reportId: 0,
        total: 0,
        success: 0,
        failed: 0,
        channels: []
      },
      channels: clone(reportChannelsMock),
      runtime: {
        registered: false,
        paused: false,
        nextRunAt: ""
      },
      acceleration: {
        status: "missing",
        targetTable: "",
        mvName: ""
      }
    };
  }

  return {
    activeReportId: active.id,
    list: clone(reportListMock),
    editor: clone(reportEditorDraftMockById[active.id]),
    schedule: clone(reportScheduleMockById[active.id]),
    preview: clone(reportExecutionPreviewMockById[active.id]),
    executions: clone(reportRecentExecutionsMockById[active.id]),
    delivery: clone(reportSendSummaryMockById[active.id]),
    channels: clone(reportChannelsMock),
    runtime: clone(reportScheduleRuntimeMockById[active.id]),
    acceleration: clone(reportAccelerationMockById[active.id])
  };
}

function replaceRecord<T>(target: Record<number, T>, source: Record<number, T>) {
  Object.keys(target).forEach((key) => {
    delete target[Number(key)];
  });

  Object.entries(clone(source)).forEach(([key, value]) => {
    target[Number(key)] = value;
  });
}
