import { useEffect, useState } from "react";
import {
  getReportWorkspace,
  runReportPreview,
  saveReportSchedule
} from "../api/report";
import ReportPushStatusCard from "../components/ReportPushStatusCard";
import ReportScheduleForm from "../components/ReportScheduleForm";
import type {
  ReportEditorDraft,
  ReportExecutionPreview,
  ReportExecutionRecord,
  ReportListItem,
  ReportPushChannel,
  ReportScheduleConfig,
  ReportScheduleRuntime,
  ReportSendResultSummary
} from "../types/contracts";
import {
  getTimeRangeLabel,
  useTimeRange
} from "../../../shared/state/TimeRangeContext";

function formatDateTime(value?: string) {
  return value || "未记录";
}

function getSchedulerRegistrationLabel(runtime: ReportScheduleRuntime) {
  if (runtime.paused) {
    return "已暂停";
  }
  return runtime.registered ? "已注册" : "未注册";
}

function getLatestScheduledStatusLabel(runtime: ReportScheduleRuntime) {
  const status = runtime.lastScheduledExecution?.status;
  if (!status) {
    return "暂无记录";
  }
  switch (status) {
    case "success":
      return "成功";
    case "failed":
      return "失败";
    case "running":
      return "执行中";
    default:
      return "未知";
  }
}

function getExecutionStatusLabel(status: ReportExecutionRecord["status"]) {
  switch (status) {
    case "success":
      return "成功";
    case "failed":
      return "失败";
    case "running":
      return "执行中";
    default:
      return "未知";
  }
}

function getStatusTone(status: ReportExecutionRecord["status"]) {
  switch (status) {
    case "success":
      return "cv-status-success";
    case "failed":
      return "cv-status-danger";
    default:
      return "cv-muted";
  }
}

export default function ReportSchedulePage() {
  const { timeRange } = useTimeRange();
  const [workspace, setWorkspace] = useState<{
    activeReportId: number;
    list: ReportListItem[];
    editor: ReportEditorDraft;
    schedule: ReportScheduleConfig;
    preview: ReportExecutionPreview;
    executions: ReportExecutionRecord[];
    delivery: ReportSendResultSummary;
    channels: ReportPushChannel[];
    runtime: ReportScheduleRuntime;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  async function loadWorkspace(
    reportId?: number,
    options?: { preserveCurrent?: boolean }
  ) {
    try {
      const data = await getReportWorkspace(reportId);
      setWorkspace(data);
      setErrorMessage(null);
      return data;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "报表工作区加载失败，请稍后重试。";

      if (!options?.preserveCurrent) {
        setWorkspace(null);
      }

      setErrorMessage(
        options?.preserveCurrent
          ? `报表工作区刷新失败，已保留当前内容：${message}`
          : `报表工作区加载失败：${message}`
      );
      throw error;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);
      setSaveStatus("idle");
      setSaveMessage(null);
      setPreviewStatus("idle");
      setPreviewMessage(null);

      try {
        const data = await getReportWorkspace(selectedReportId ?? undefined);
        if (!cancelled) {
          setWorkspace(data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            `报表工作区加载失败：${
              error instanceof Error
                ? error.message
                : "报表工作区加载失败，请稍后重试。"
            }`
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedReportId]);

  const reportList = workspace?.list ?? [];
  const activeReportId = workspace?.activeReportId ?? selectedReportId;
  const editor = workspace?.editor ?? null;
  const schedule = workspace?.schedule ?? null;
  const preview = workspace?.preview ?? null;
  const executions = workspace?.executions ?? [];
  const summary = workspace?.delivery ?? null;
  const runtime = workspace?.runtime ?? null;
  const selectedChannels =
    schedule && workspace
      ? workspace.channels.filter((channel) =>
          schedule.channelIds.includes(channel.id)
        )
      : [];
  const successRate =
    summary && summary.total > 0
      ? `${Math.round((summary.success / summary.total) * 100)}%`
      : "0%";

  async function handleSaveSchedule(nextSchedule: ReportScheduleConfig) {
    setSaveStatus("pending");
    setSaveMessage(null);

    try {
      const savedSchedule = await saveReportSchedule(nextSchedule);
      setWorkspace((current) =>
        current
          ? {
              ...current,
              schedule: {
                ...current.schedule,
                ...savedSchedule
              },
              editor: {
                ...current.editor,
                recipientChannelIds: savedSchedule.channelIds
              }
            }
          : current
      );
      try {
        await loadWorkspace(nextSchedule.reportId, { preserveCurrent: true });
      } catch {
        setSaveMessage("保存成功，工作区刷新失败，已保留当前内容");
        setSaveStatus("success");
        return;
      }
      setSaveStatus("success");
      setSaveMessage("保存成功");
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(
        error instanceof Error ? error.message : "报表调度保存失败"
      );
    }
  }

  async function handleRunPreview() {
    if (!workspace || previewStatus === "pending") {
      return;
    }

    setPreviewStatus("pending");
    setPreviewMessage(null);

    try {
      const resp = await runReportPreview(workspace.activeReportId);
      const nextStatus =
        resp.execution.status === "success" ? "success" : "error";
      setWorkspace((current) =>
        current
          ? {
              ...current,
              preview: resp.preview,
              executions: [resp.execution, ...current.executions],
              delivery: resp.delivery
            }
          : current
      );
      setPreviewStatus(nextStatus);
      setPreviewMessage(
        nextStatus === "success" ? "预览执行完成" : resp.preview.message
      );
    } catch (error) {
      setPreviewStatus("error");
      setPreviewMessage(error instanceof Error ? error.message : "预览执行失败");
    }
  }

  return (
    <section className="cv-section-stack">
      <header className="cv-page-header">
        <div>
          <h1 className="cv-page-title">定时报表</h1>
          <p className="cv-page-description">
            对齐 `scheduled_reports_dingtalk_push` 设计稿重做，保留当前报表配置、保存调度、执行预览、运行态回刷与 v1/v2 共存切换链路。
          </p>
        </div>
        <div className="cv-header-actions">
          <button type="button" className="cv-secondary-button">
            导出统计
          </button>
          <button type="button" className="cv-action-button">
            创建报表
          </button>
        </div>
      </header>

      <section className="cv-panel cv-panel-dark">
        <div className="cv-panel-header">
          <div>
            <h2 className="cv-panel-title">自动化推送工作台</h2>
            <p className="cv-panel-description">
              当前时间范围：{getTimeRangeLabel(timeRange)}。支持基于查询模板生成日报/周报，并投递到钉钉渠道。
            </p>
          </div>
          <span className="cv-chip">Report Push First</span>
        </div>
        <div className="cv-grid-3">
          <div>
            <div className="cv-muted">活跃报表任务</div>
            <div className="cv-hero-number">{reportList.length}</div>
          </div>
          <div>
            <div className="cv-muted">推送成功率</div>
            <div className="cv-hero-number">{successRate}</div>
          </div>
          <div>
            <div className="cv-muted">当前激活任务</div>
            <div className="cv-hero-number" style={{ fontSize: "38px" }}>
              {activeReportId ? `#${activeReportId}` : "未选择"}
            </div>
          </div>
        </div>
      </section>

      {loading ? <div className="cv-status-card">加载中...</div> : null}
      {!loading && errorMessage ? (
        <div className="cv-status-card" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {!loading && reportList.length > 0 ? (
        <div className="cv-report-grid">
          <div className="cv-section-stack">
            <section className="cv-panel cv-panel-soft">
              <div className="cv-panel-header">
                <div>
                  <h2 className="cv-panel-title">报表配置</h2>
                  <p className="cv-panel-description">
                    以设计稿的左侧构建器布局承接查询模式、模板、输出格式与说明。
                  </p>
                </div>
                <span className="cv-badge">可运行壳子</span>
              </div>
              {editor ? (
                <div className="cv-form-grid">
                  <div className="cv-form-two-up">
                    <div className="cv-form-row">
                      <span className="cv-label">报表名称</span>
                      <div className="cv-input">报表名称：{editor.name}</div>
                    </div>
                    <div className="cv-form-row">
                      <span className="cv-label">模板</span>
                      <div className="cv-input">{editor.templateKey}</div>
                    </div>
                  </div>
                  <div className="cv-form-two-up">
                    <div className="cv-form-row">
                      <span className="cv-label">查询模式</span>
                      <div className="cv-input">查询模式：{editor.queryMode.toUpperCase()}</div>
                    </div>
                    <div className="cv-form-row">
                      <span className="cv-label">输出格式</span>
                      <div className="cv-input">输出格式：{editor.outputFormat}</div>
                    </div>
                  </div>
                  <div className="cv-form-row">
                    <span className="cv-label">查询语句</span>
                    <pre className="cv-code">{editor.queryText}</pre>
                  </div>
                  <div className="cv-form-row">
                    <span className="cv-label">配置说明</span>
                    <div className="cv-input">配置说明：{editor.desc}</div>
                  </div>
                </div>
              ) : null}
            </section>

            {schedule && workspace ? (
              <section className="cv-panel">
                <div className="cv-panel-header">
                  <div>
                    <h2 className="cv-panel-title">调度配置</h2>
                    <p className="cv-panel-description">
                      保留真实保存链路，视觉上对齐设计稿的配置面板与 DingTalk 推送分区。
                    </p>
                  </div>
                </div>
                <div className="cv-section-stack">
                  <div className="cv-input">调度表达式：{schedule.cron}</div>
                  {runtime ? (
                    <div className="cv-kv">
                      <div className="cv-kv-row">
                        <span className="cv-kv-key">注册状态</span>
                        <span className="cv-kv-value">
                          注册状态：{getSchedulerRegistrationLabel(runtime)}
                        </span>
                      </div>
                      <div className="cv-kv-row">
                        <span className="cv-kv-key">下次执行时间</span>
                        <span className="cv-kv-value">
                          下次执行时间：{formatDateTime(runtime.nextRunAt)}
                        </span>
                      </div>
                      <div className="cv-kv-row">
                        <span className="cv-kv-key">最近一次定时执行</span>
                        <span className="cv-kv-value">
                          最近一次定时执行：{getLatestScheduledStatusLabel(runtime)}
                        </span>
                      </div>
                      <div className="cv-kv-row">
                        <span className="cv-kv-key">最近一次定时执行时间</span>
                        <span className="cv-kv-value">
                          最近一次定时执行时间：
                          {formatDateTime(
                            runtime.lastScheduledExecution?.endedAt ||
                              runtime.lastScheduledExecution?.startedAt
                          )}
                        </span>
                      </div>
                      <div className="cv-kv-row">
                        <span className="cv-kv-key">最近一次触发方式 / 执行人</span>
                        <span className="cv-kv-value">
                          最近一次触发方式 / 执行人：
                          {runtime.lastScheduledExecution
                            ? `${runtime.lastScheduledExecution.trigger} / ${runtime.lastScheduledExecution.operatorName}`
                            : "未记录"}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <ReportScheduleForm
                    initialValue={schedule}
                    channels={workspace.channels}
                    isSubmitting={saveStatus === "pending"}
                    onSubmit={handleSaveSchedule}
                  />
                  <ReportPushStatusCard
                    actionLabel="保存调度"
                    status={saveStatus}
                    message={saveMessage ?? undefined}
                    idleMessage="尚未保存调度"
                  />
                </div>
              </section>
            ) : null}

            <section className="cv-panel">
              <div className="cv-panel-header">
                <div>
                  <h2 className="cv-panel-title">报表任务（Mock）</h2>
                  <p className="cv-panel-description">
                    当前工作区通过 mock + 契约层驱动，切换任务会刷新配置、调度和运行态。
                  </p>
                </div>
                <span className="cv-chip">{activeReportId ? `Active #${activeReportId}` : "No Active"}</span>
              </div>
              <div className="cv-table-wrap">
                <table className="cv-table">
                  <thead>
                    <tr>
                      <th>报表</th>
                      <th>状态</th>
                      <th>更新时间</th>
                      <th>动作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportList.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                          <span className="cv-muted">{item.desc}</span>
                        </td>
                        <td>{item.status === "enabled" ? "启用" : "停用"}</td>
                        <td>{item.updatedAt}</td>
                        <td>
                          <button
                            type="button"
                            className="cv-link-button"
                            aria-pressed={activeReportId === item.id}
                            aria-label={`切换到报表 ${item.name}`}
                            onClick={() => setSelectedReportId(item.id)}
                          >
                            切换任务
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="cv-section-stack">
            {selectedChannels.length > 0 ? (
              <section className="cv-panel">
                <div className="cv-panel-header">
                  <div>
                    <h2 className="cv-panel-title">钉钉投递对象</h2>
                    <p className="cv-panel-description">
                      对齐设计稿右侧通知面板，同时保留当前真实渠道选择结果。
                    </p>
                  </div>
                </div>
                <div className="cv-section-stack">
                  {selectedChannels.map((channel) => (
                    <div key={channel.id} className="cv-status-card">
                      {channel.name}（{channel.key}）
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {preview ? (
              <section className="cv-panel">
                <div className="cv-panel-header">
                  <div>
                    <h2 className="cv-panel-title">执行预览</h2>
                    <p className="cv-panel-description">
                      可手动试跑当前报表，并同步刷新执行历史和推送成功率。
                    </p>
                  </div>
                </div>
                <div className="cv-section-stack">
                  <div className="cv-input">执行预览：{preview.message}</div>
                  <div className="cv-kv">
                    <div className="cv-kv-row">
                      <span className="cv-kv-key">下次执行</span>
                      <span className="cv-kv-value">{formatDateTime(preview.nextRunAt)}</span>
                    </div>
                    <div className="cv-kv-row">
                      <span className="cv-kv-key">最近一次执行</span>
                      <span className="cv-kv-value">{formatDateTime(preview.lastRunAt)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cv-action-button"
                    onClick={handleRunPreview}
                    disabled={previewStatus === "pending"}
                  >
                    {previewStatus === "pending" ? "预览执行中..." : "执行预览"}
                  </button>
                  <ReportPushStatusCard
                    actionLabel="预览执行"
                    status={previewStatus}
                    message={previewMessage ?? undefined}
                    idleMessage="尚未执行预览"
                  />
                </div>
              </section>
            ) : null}

            {summary ? (
              <section className="cv-panel cv-panel-soft">
                <div className="cv-panel-header">
                  <div>
                    <h2 className="cv-panel-title">投递汇总</h2>
                    <p className="cv-panel-description">
                      推送成功率：{successRate}（成功 {summary.success} / 总数 {summary.total}）
                    </p>
                  </div>
                </div>
                <div className="cv-section-stack">
                  {summary.channels.map((item) => (
                    <div key={item.channelId} className="cv-kv">
                      <div className="cv-kv-row">
                        <span className="cv-kv-key">渠道</span>
                        <span className="cv-kv-value">{item.channelTyp} / #{item.channelId}</span>
                      </div>
                      <div className="cv-kv-row">
                        <span className="cv-kv-key">成功 / 失败</span>
                        <span className="cv-kv-value">
                          {item.success} / {item.failed}
                        </span>
                      </div>
                      <div className="cv-kv-row">
                        <span className="cv-kv-key">最近发送</span>
                        <span className="cv-kv-value">{formatDateTime(item.lastSentAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {executions.length > 0 ? (
              <section className="cv-panel">
                <div className="cv-panel-header">
                  <div>
                    <h2 className="cv-panel-title">最近执行记录</h2>
                    <p className="cv-panel-description">
                      保留执行历史回刷行为，用于检视手动预览和定时执行结果。
                    </p>
                  </div>
                </div>
                <div className="cv-section-stack">
                  {executions.map((item) => (
                    <div key={item.id} className="cv-status-card">
                      <strong>
                        {item.trigger} / {item.status} / {item.operatorName}
                      </strong>
                      <div className={getStatusTone(item.status)} style={{ marginTop: 8 }}>
                        {getExecutionStatusLabel(item.status)} · {item.startedAt}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
