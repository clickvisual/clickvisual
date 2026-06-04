import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createReport,
  deleteReport,
  getReportWorkspace,
  listReportSourceDatabases,
  listReportSourceInstances,
  listReportSourceTables,
  listReportTableColumns,
  runReportAccelerationCheck,
  runReportPreview,
  saveReportSchedule
} from "../api/report";
import ReportCreateForm from "../components/ReportCreateForm";
import ReportPushStatusCard from "../components/ReportPushStatusCard";
import ReportScheduleForm from "../components/ReportScheduleForm";
import { formatSqlForDisplay } from "../utils/formatSql";
import type {
  ReportAccelerationCheck,
  ReportAccelerationStatus,
  ReportCreatePayload,
  ReportEditorDraft,
  ReportExecutionPreview,
  ReportExecutionRecord,
  ReportListItem,
  ReportPushChannel,
  ReportScheduleConfig,
  ReportScheduleRuntime,
  ReportSourceColumn,
  ReportSourceDatabase,
  ReportSourceInstance,
  ReportSourceTable,
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

function getExecutionTriggerLabel(trigger: ReportExecutionRecord["trigger"]) {
  return trigger === "schedule" ? "定时执行" : "手动执行";
}

function getAccelerationStatusLabel(acceleration?: ReportAccelerationStatus | null) {
  switch (acceleration?.status) {
    case "ready":
      return "已切换到聚合表";
    case "error":
      return "聚合构建失败";
    case "provisioning":
    case "backfilling":
    case "rebuilding":
      return "聚合构建中";
    case "missing":
      return "尚未生成";
    default:
      return acceleration?.status || "未记录";
  }
}

function getReportTaskStatusLabel(status: ReportListItem["status"]) {
  return status === "enabled" ? "启用" : "停用";
}

type FeedbackDialogState = {
  title: string;
  message: string;
};

export default function ReportSchedulePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { reportId: reportIdParam } = useParams<{ reportId?: string }>();
  const { timeRange } = useTimeRange();
  const routeReportId = useMemo(() => {
    const parsed = Number(reportIdParam);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [reportIdParam]);
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
    acceleration: ReportAccelerationStatus;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sourceInstances, setSourceInstances] = useState<ReportSourceInstance[]>([]);
  const [sourceDatabases, setSourceDatabases] = useState<ReportSourceDatabase[]>([]);
  const [sourceTables, setSourceTables] = useState<ReportSourceTable[]>([]);
  const [sourceColumns, setSourceColumns] = useState<ReportSourceColumn[]>([]);
  const [loadingSourceDatabases, setLoadingSourceDatabases] = useState(false);
  const [loadingSourceTables, setLoadingSourceTables] = useState(false);
  const [loadingSourceColumns, setLoadingSourceColumns] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [backfillStatus, setBackfillStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);
  const [lastBackfillCheck, setLastBackfillCheck] = useState<ReportAccelerationCheck | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [confirmDeleteReportId, setConfirmDeleteReportId] = useState<number | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(routeReportId);
  const [selectedExecution, setSelectedExecution] = useState<ReportExecutionRecord | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialogState | null>(null);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);

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
    setSelectedReportId(routeReportId);
  }, [routeReportId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);
      setSaveStatus("idle");
      setSaveMessage(null);
      setCreateStatus("idle");
      setCreateMessage(null);
      setEditStatus("idle");
      setEditMessage(null);
      setPreviewStatus("idle");
      setPreviewMessage(null);
      setBackfillStatus("idle");
      setBackfillMessage(null);
      setLastBackfillCheck(null);
      setDeleteStatus("idle");
      setDeleteMessage(null);
      setConfirmDeleteReportId(null);
      setConfirmEditOpen(false);
      setScheduleOpen(false);

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
  const enabledReportCount = reportList.filter((item) => item.status === "enabled").length;
  const pausedReportCount = reportList.length - enabledReportCount;
  const editor = workspace?.editor ?? null;
  const schedule = workspace?.schedule ?? null;
  const preview = workspace?.preview ?? null;
  const executions = workspace?.executions ?? [];
  const summary = workspace?.delivery ?? null;
  const runtime = workspace?.runtime ?? null;
  const acceleration = workspace?.acceleration ?? null;
  const activeReportName =
    editor?.name ??
    reportList.find((item) => item.id === activeReportId)?.name ??
    "未选择报表任务";
  const activeReportDisplay = activeReportId
    ? `${activeReportName} #${activeReportId}`
    : activeReportName;
  const formattedQueryText = editor?.queryText
    ? formatSqlForDisplay(editor.queryText)
    : "";
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
  const reportRouteBase = useMemo(() => {
    const matched = location.pathname.match(/^(.*\/v2)(?:\/.*)?$/);
    return matched?.[1] ?? "/v2";
  }, [location.pathname]);

  useEffect(() => {
    if (activeReportId && String(activeReportId) !== reportIdParam) {
      navigate(`${reportRouteBase}/reports/${activeReportId}`, { replace: true });
      return;
    }
    if (!activeReportId && reportIdParam) {
      navigate(reportRouteBase, { replace: true });
    }
  }, [activeReportId, navigate, reportIdParam, reportRouteBase]);

  async function handleSaveSchedule(nextSchedule: ReportScheduleConfig) {
    setSaveStatus("pending");
    setSaveMessage(null);
    setFeedbackDialog(null);

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
      setScheduleOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "报表调度保存失败";
      setSaveStatus("error");
      setSaveMessage(message);
      setFeedbackDialog({
        title: "保存报表调度失败",
        message
      });
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

  async function handleRunAccelerationBackfill() {
    if (!workspace || backfillStatus === "pending") {
      return;
    }

    setBackfillStatus("pending");
    setBackfillMessage(null);
    setLastBackfillCheck(null);

    try {
      const resp = await runReportAccelerationCheck(workspace.activeReportId);
      setWorkspace((current) =>
        current
          ? {
              ...current,
              acceleration: resp.acceleration
            }
          : current
      );
      setLastBackfillCheck(resp.check);
      setBackfillStatus(resp.check.passed ? "success" : "error");
      setBackfillMessage(resp.check.summary);
      try {
        await loadWorkspace(workspace.activeReportId, { preserveCurrent: true });
      } catch {
        return;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "手动自检失败";
      setBackfillStatus("error");
      setBackfillMessage(message);
    }
  }

  async function handleOpenCreateReport() {
    if (createStatus === "pending" || editStatus === "pending" || deleteStatus === "pending") {
      return;
    }

    setCreateStatus("idle");
    setCreateMessage(null);
    try {
      const instances = await listReportSourceInstances();
      setSourceInstances(instances);
      setSourceDatabases([]);
      setSourceTables([]);
      setSourceColumns([]);
      setLoadingSourceDatabases(false);
      setLoadingSourceTables(false);
      setLoadingSourceColumns(false);
      setEditOpen(false);
      setCreateOpen(true);
    } catch (error) {
      setCreateStatus("error");
      setCreateMessage(
        error instanceof Error ? error.message : "加载数据源失败"
      );
    }
  }

  async function handleLoadColumns(
    instanceId: number,
    database: string,
    table: string
  ) {
    setLoadingSourceColumns(true);
    try {
      const columns = await listReportTableColumns(instanceId, database, table);
      setSourceColumns(columns);
    } finally {
      setLoadingSourceColumns(false);
    }
  }

  async function handleInstanceChange(instanceId: number) {
    setLoadingSourceDatabases(true);
    setLoadingSourceTables(true);
    setLoadingSourceColumns(false);
    try {
      const databases = await listReportSourceDatabases(instanceId);
      setSourceTables([]);
      setSourceColumns([]);

      let preferredIndex = 0;
      let preferredTables: ReportSourceTable[] = [];
      for (let index = 0; index < databases.length; index += 1) {
        const tables = await listReportSourceTables(instanceId, databases[index].name);
        if (tables.length > 0) {
          preferredIndex = index;
          preferredTables = tables;
          break;
        }
      }

      if (databases.length > 0 && preferredIndex > 0) {
        setSourceDatabases([
          databases[preferredIndex],
          ...databases.slice(0, preferredIndex),
          ...databases.slice(preferredIndex + 1)
        ]);
      } else {
        setSourceDatabases(databases);
      }

      setSourceTables(preferredTables);
    } finally {
      setLoadingSourceDatabases(false);
      setLoadingSourceTables(false);
    }
  }

  async function handleDatabaseChange(instanceId: number, database: string) {
    setLoadingSourceTables(true);
    setLoadingSourceColumns(false);
    setSourceTables([]);
    setSourceColumns([]);
    try {
      const tables = await listReportSourceTables(instanceId, database);
      setSourceTables(tables);
    } finally {
      setLoadingSourceTables(false);
    }
  }

  async function handleCreateReport(payload: ReportCreatePayload) {
    setCreateStatus("pending");
    setCreateMessage(null);
    setFeedbackDialog(null);

    try {
      const created = await createReport(payload);
      setCreateOpen(false);
      setSelectedReportId(created.reportId);
      await loadWorkspace(created.reportId);
      setCreateStatus("success");
      setCreateMessage("报表已创建");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "创建报表失败";
      setCreateStatus("error");
      setCreateMessage(message);
      setFeedbackDialog({
        title: "创建报表失败",
        message
      });
    }
  }

  async function openEditReportForm() {
    if (!editor) {
      return;
    }
    if (!editor.builder) {
      setEditStatus("error");
      setEditMessage("当前报表缺少可编辑的 builder 配置，请重新创建。");
      setFeedbackDialog({
        title: "编辑报表失败",
        message: "当前报表缺少可编辑的 builder 配置，请重新创建。"
      });
      return;
    }

    setEditStatus("idle");
    setEditMessage(null);
    setFeedbackDialog(null);
    setCreateOpen(false);
    setLoadingSourceDatabases(true);
    setLoadingSourceTables(true);
    setLoadingSourceColumns(true);
    try {
      const instances = await listReportSourceInstances();
      setSourceInstances(instances);
      const instanceId = editor.builder.instanceId || instances[0]?.id || 0;
      const databases = await listReportSourceDatabases(instanceId);
      setSourceDatabases(databases);
      const tables = editor.builder.database
        ? await listReportSourceTables(instanceId, editor.builder.database)
        : [];
      setSourceTables(tables);
      const columns =
        editor.builder.database && editor.builder.table
          ? await listReportTableColumns(
              instanceId,
              editor.builder.database,
              editor.builder.table
            )
          : [];
      setSourceColumns(columns);
      setEditOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "加载报表编辑上下文失败";
      setEditStatus("error");
      setEditMessage(message);
      setFeedbackDialog({
        title: "编辑报表失败",
        message
      });
    } finally {
      setLoadingSourceDatabases(false);
      setLoadingSourceTables(false);
      setLoadingSourceColumns(false);
    }
  }

  function handleOpenEditReport() {
    if (!editor) {
      return;
    }
    setConfirmEditOpen(true);
  }

  async function handleConfirmOpenEditReport() {
    setConfirmEditOpen(false);
    await openEditReportForm();
  }

  async function handleEditReport(payload: ReportCreatePayload) {
    if (!editor) {
      return;
    }

    setEditStatus("pending");
    setEditMessage(null);
    setFeedbackDialog(null);

    try {
      const updated = await createReport({
        ...payload,
        desc: editor.desc,
        status: reportList.find((item) => item.id === payload.reportId)?.status ?? "enabled",
        queryMode: editor.queryMode,
        queryText: editor.queryText,
        templateKey: editor.templateKey,
        outputFormat: editor.outputFormat,
        dutyUid: schedule?.dutyUid ?? 0
      });
      setEditOpen(false);
      setSelectedReportId(updated.reportId);
      await loadWorkspace(updated.reportId);
      setEditStatus("success");
      setEditMessage("报表已更新");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "更新报表失败";
      setEditStatus("error");
      setEditMessage(message);
      setFeedbackDialog({
        title: "编辑报表失败",
        message
      });
    }
  }

  async function handleDeleteReport(reportId: number) {
    if (deleteStatus === "pending") {
      return;
    }

    const nextList = reportList.filter((item) => item.id !== reportId);
    const nextActiveReportId =
      activeReportId === reportId ? nextList[0]?.id ?? null : activeReportId ?? nextList[0]?.id ?? null;

    setDeleteStatus("pending");
    setDeleteMessage(null);

    try {
      await deleteReport(reportId);
      setConfirmDeleteReportId(null);
      setCreateOpen(false);
      setEditOpen(false);
      setSelectedReportId(nextActiveReportId);
      await loadWorkspace(nextActiveReportId ?? undefined);
      setDeleteStatus("success");
      setDeleteMessage("报表已删除");
    } catch (error) {
      setDeleteStatus("error");
      setDeleteMessage(
        error instanceof Error ? error.message : "删除报表失败"
      );
    }
  }

  return (
    <section className="cv-section-stack cv-report-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>报表</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">定时报表</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">定时报表</h1>
        </div>
        <div className="cv-header-actions">
          <button type="button" className="cv-secondary-button">
            导出统计
          </button>
          <button
            type="button"
            className="cv-action-button"
            onClick={handleOpenCreateReport}
            disabled={createStatus === "pending"}
          >
            {createStatus === "pending" ? "创建中..." : "创建报表"}
          </button>
        </div>
      </header>

      <section className="cv-panel cv-report-hero">
        <div className="cv-panel-header">
          <div className="cv-breadcrumb">
            <span>自动化推送</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">{activeReportDisplay}</span>
          </div>
          <div className="cv-report-hero__chips">
            <span className="cv-chip">Report Push</span>
            <span className="cv-pill">{getTimeRangeLabel(timeRange)}</span>
          </div>
        </div>
        <div className="cv-report-hero__stats">
          <div className="cv-report-stat">
            <div className="cv-report-stat__label">活跃报表任务</div>
            <div className="cv-report-stat__value">{reportList.length}</div>
          </div>
          <div className="cv-report-stat">
            <div className="cv-report-stat__label">推送成功率</div>
            <div className="cv-report-stat__value">{successRate}</div>
          </div>
          <div className="cv-report-stat">
            <div className="cv-report-stat__label">当前任务</div>
            <div className="cv-report-stat__value">
              {activeReportDisplay}
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
      {createMessage && createStatus !== "error" ? (
        <div
          className="cv-status-card"
          role="status"
        >
          {createMessage}
        </div>
      ) : null}
      {editMessage && editStatus !== "error" ? (
        <div
          className="cv-status-card"
          role="status"
        >
          {editMessage}
        </div>
      ) : null}
      {deleteMessage ? (
        <div
          className="cv-status-card"
          role={deleteStatus === "error" ? "alert" : "status"}
        >
          {deleteStatus === "error"
            ? `删除报表失败：${deleteMessage}`
            : deleteMessage}
        </div>
      ) : null}
      {createOpen ? (
        <ReportCreateForm
          instances={sourceInstances}
          databases={sourceDatabases}
          tables={sourceTables}
          columns={sourceColumns}
          isLoadingDatabases={loadingSourceDatabases}
          isLoadingTables={loadingSourceTables}
          isLoadingColumns={loadingSourceColumns}
          isSubmitting={createStatus === "pending"}
          onInstanceChange={handleInstanceChange}
          onDatabaseChange={handleDatabaseChange}
          onLoadColumns={handleLoadColumns}
          onSubmit={handleCreateReport}
        />
      ) : null}
      {!loading && reportList.length > 0 ? (
        <div className="cv-report-grid cv-report-grid--compact">
          <div className="cv-section-stack">
            <section className="cv-panel cv-report-nav-panel">
              <div className="cv-panel-header">
                <div>
                  <h2 className="cv-panel-title">任务导航</h2>
                  <p className="cv-panel-description">用左侧任务树切换当前工作区与调度面板。</p>
                </div>
                <span className="cv-chip">{reportList.length} 个任务</span>
              </div>
              <div className="cv-report-nav">
                <div className="cv-report-nav__summary">
                  <div className="cv-report-nav__summary-item">
                    <span className="cv-report-nav__summary-label">当前任务</span>
                    <strong className="cv-report-nav__summary-value">
                      {activeReportId ? activeReportDisplay : "未选择"}
                    </strong>
                  </div>
                  <div className="cv-report-nav__summary-meta">
                    <span>{enabledReportCount} 启用</span>
                    <span>{pausedReportCount} 停用</span>
                  </div>
                </div>
                <div className="cv-report-nav__list" role="list" aria-label="报表任务列表">
                  {reportList.map((item) => (
                    <div key={item.id} className="cv-report-nav__node" role="listitem">
                      <div className="cv-report-nav__node-main">
                        <button
                          type="button"
                          className={`cv-report-nav__item${
                            activeReportId === item.id ? " cv-report-nav__item--active" : ""
                          }`}
                          aria-pressed={activeReportId === item.id}
                          aria-label={`切换到报表 ${item.name}`}
                          onClick={() => setSelectedReportId(item.id)}
                        >
                          <span className="cv-report-nav__item-rail" aria-hidden="true" />
                          <span className="cv-report-nav__item-content">
                            <span className="cv-report-nav__item-head">
                              <strong>{item.name}</strong>
                              <span
                                className={
                                  item.status === "enabled"
                                    ? "cv-badge cv-report-nav__item-status"
                                    : "cv-pill cv-report-nav__item-status"
                                }
                              >
                                {getReportTaskStatusLabel(item.status)}
                              </span>
                            </span>
                            <span className="cv-report-nav__item-desc">{item.desc}</span>
                            <span className="cv-report-nav__item-meta">
                              #{item.id} · {item.updatedAt}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="cv-secondary-button cv-report-nav__delete"
                          aria-label={`删除报表 ${item.name}`}
                          disabled={deleteStatus === "pending"}
                          onClick={() =>
                            setConfirmDeleteReportId((current) =>
                              current === item.id ? null : item.id
                            )
                          }
                        >
                          删除
                        </button>
                      </div>
                      {confirmDeleteReportId === item.id ? (
                        <div className="cv-status-card cv-status-card--compact cv-report-nav__confirm">
                          <strong>{`确认删除报表「${item.name}」？`}</strong>
                          <span className="cv-muted">
                            删除后会一起清理该报表的调度配置和执行历史，且无法恢复。
                          </span>
                          <div className="cv-header-actions">
                            <button
                              type="button"
                              className="cv-action-button"
                              aria-label={`确认删除 报表 ${item.name}`}
                              disabled={deleteStatus === "pending"}
                              onClick={() => void handleDeleteReport(item.id)}
                            >
                              {deleteStatus === "pending" ? "删除中..." : "确认删除"}
                            </button>
                            <button
                              type="button"
                              className="cv-secondary-button"
                              disabled={deleteStatus === "pending"}
                              onClick={() => setConfirmDeleteReportId(null)}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="cv-section-stack cv-report-main-stack">
            <section className="cv-panel cv-panel-soft">
              <div className="cv-panel-header">
                <div>
                  <h2 className="cv-panel-title">报表配置</h2>
                  <div className="cv-report-active-task">
                    <span className="cv-report-active-task__label">当前任务</span>
                    <strong className="cv-report-active-task__name">{activeReportDisplay}</strong>
                  </div>
                </div>
                <div className="cv-header-actions">
                  <button
                    type="button"
                    className="cv-secondary-button"
                    onClick={handleOpenEditReport}
                    disabled={!editor?.builder || editStatus === "pending"}
                  >
                    {editStatus === "pending" ? "保存中..." : "编辑报表"}
                  </button>
                </div>
              </div>
              {editor ? (
                <div className="cv-report-detail-list">
                  <div className="cv-report-detail-row">
                    <span className="cv-report-detail-row__label">报表名称</span>
                    <strong className="cv-report-detail-row__value">{editor.name}</strong>
                  </div>
                  <div className="cv-report-detail-row">
                    <span className="cv-report-detail-row__label">模板</span>
                    <span className="cv-report-detail-row__value">{editor.templateKey}</span>
                  </div>
                  <div className="cv-report-detail-row">
                    <span className="cv-report-detail-row__label">查询模式</span>
                    <span className="cv-report-detail-row__value">{editor.queryMode.toUpperCase()}</span>
                  </div>
                  <div className="cv-report-detail-row">
                    <span className="cv-report-detail-row__label">输出格式</span>
                    <span className="cv-report-detail-row__value">{editor.outputFormat}</span>
                  </div>
                  <div className="cv-report-detail-row">
                    <span className="cv-report-detail-row__label">配置说明</span>
                    <span className="cv-report-detail-row__value">{editor.desc}</span>
                  </div>
                  <div className="cv-report-detail-row cv-report-detail-row--code">
                    <span className="cv-report-detail-row__label">查询语句</span>
                    <pre className="cv-code cv-report-code cv-report-detail-row__code">
                      {formattedQueryText || editor.queryText}
                    </pre>
                  </div>
                  {acceleration ? (
                    <div className="cv-report-detail-row cv-report-detail-row--code">
                      <span className="cv-report-detail-row__label">聚合状态</span>
                      <div className="cv-report-detail-row__value cv-section-stack cv-section-stack--tight">
                        <div className="cv-report-inline-summary">
                          <div className="cv-report-inline-summary__item">
                            <span className="cv-report-inline-summary__label">状态</span>
                            <strong>{getAccelerationStatusLabel(acceleration)}</strong>
                          </div>
                          <div className="cv-report-inline-summary__item">
                            <span className="cv-report-inline-summary__label">目标表</span>
                            <strong>{acceleration.targetTable || "未生成"}</strong>
                          </div>
                          <div className="cv-report-inline-summary__item">
                            <span className="cv-report-inline-summary__label">物化视图</span>
                            <strong>{acceleration.mvName || "未生成"}</strong>
                          </div>
                          <div className="cv-report-inline-summary__item">
                            <span className="cv-report-inline-summary__label">回填窗口</span>
                            <strong>
                              {acceleration.backfillStartAt && acceleration.backfillEndAt
                                ? `${formatDateTime(acceleration.backfillStartAt)} ~ ${formatDateTime(acceleration.backfillEndAt)}`
                                : "未记录"}
                            </strong>
                          </div>
                        </div>
                        {acceleration.errorMessage ? (
                          <div className="cv-status-card cv-status-card--compact">
                            <strong>错误信息</strong>
                            <span className="cv-muted">{acceleration.errorMessage}</span>
                          </div>
                        ) : null}
                        <div className="cv-header-actions">
                          <button
                            type="button"
                            className="cv-secondary-button"
                            onClick={handleRunAccelerationBackfill}
                            disabled={!workspace || backfillStatus === "pending"}
                          >
                            {backfillStatus === "pending" ? "自检中..." : "手动自检"}
                          </button>
                        </div>
                        <ReportPushStatusCard
                          actionLabel="手动自检"
                          status={backfillStatus}
                          message={backfillMessage ?? undefined}
                          idleMessage="仅校验今天 00:00 到当前整点的数据，不会自动修改聚合表"
                        />
                        {(lastBackfillCheck ?? acceleration.lastCheck) ? (
                          <div className="cv-kv">
                            <div className="cv-kv-row">
                              <span className="cv-kv-key">自检窗口</span>
                              <span className="cv-kv-value">
                                {(lastBackfillCheck ?? acceleration.lastCheck)?.windowStart} ~{" "}
                                {(lastBackfillCheck ?? acceleration.lastCheck)?.windowEnd}
                              </span>
                            </div>
                            <div className="cv-kv-row">
                              <span className="cv-kv-key">自检结果</span>
                              <span
                                className={`cv-kv-value ${
                                  (lastBackfillCheck ?? acceleration.lastCheck)?.passed
                                    ? "cv-status-success"
                                    : "cv-status-danger"
                                }`}
                              >
                                {(lastBackfillCheck ?? acceleration.lastCheck)?.summary}
                              </span>
                            </div>
                            {((lastBackfillCheck ?? acceleration.lastCheck)?.blocks ?? []).map((block) => (
                              <div key={`${block.blockKey}-${block.metricName}`} className="cv-kv-row">
                                <span className="cv-kv-key">
                                  {block.blockLabel} / {block.metricName}
                                </span>
                                <span className="cv-kv-value">
                                  聚合表 {block.aggregatedTotal}，直接 count {block.directTotal}
                                  {block.mismatchedBuckets.length > 0
                                    ? `；异常桶：${block.mismatchedBuckets
                                        .map(
                                          (item) =>
                                            `${item.bucketTime}(聚合 ${item.aggregatedValue} / 直接 ${item.directValue})`
                                        )
                                        .join("，")}`
                                    : "；分桶一致"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            {schedule && workspace ? (
              <section className="cv-panel">
                <div className="cv-panel-header">
                  <div>
                    <h2 className="cv-panel-title">调度配置</h2>
                  </div>
                  <div className="cv-header-actions">
                    <button
                      type="button"
                      className="cv-secondary-button"
                      onClick={() => setScheduleOpen(true)}
                      disabled={saveStatus === "pending"}
                    >
                      编辑调度
                    </button>
                  </div>
                </div>
                <div className="cv-section-stack">
                  <div className="cv-report-detail-list">
                    <div className="cv-report-detail-row">
                      <span className="cv-report-detail-row__label">Cron</span>
                      <strong className="cv-report-detail-row__value">{schedule.cron || "未设置"}</strong>
                    </div>
                    <div className="cv-report-detail-row">
                      <span className="cv-report-detail-row__label">渠道数量</span>
                      <span className="cv-report-detail-row__value">{schedule.channelIds.length}</span>
                    </div>
                    {runtime ? (
                      <>
                        <div className="cv-report-detail-row">
                          <span className="cv-report-detail-row__label">注册状态</span>
                          <span className="cv-report-detail-row__value">{getSchedulerRegistrationLabel(runtime)}</span>
                        </div>
                        <div className="cv-report-detail-row">
                          <span className="cv-report-detail-row__label">下次执行时间</span>
                          <span className="cv-report-detail-row__value">{formatDateTime(runtime.nextRunAt)}</span>
                        </div>
                        <div className="cv-report-detail-row">
                          <span className="cv-report-detail-row__label">最近一次定时执行</span>
                          <span className="cv-report-detail-row__value">{getLatestScheduledStatusLabel(runtime)}</span>
                        </div>
                        <div className="cv-report-detail-row">
                          <span className="cv-report-detail-row__label">最近一次定时执行时间</span>
                          <span className="cv-report-detail-row__value">
                            {formatDateTime(
                              runtime.lastScheduledExecution?.endedAt ||
                                runtime.lastScheduledExecution?.startedAt
                            )}
                          </span>
                        </div>
                        <div className="cv-report-detail-row">
                          <span className="cv-report-detail-row__label">最近一次触发方式 / 执行人</span>
                          <span className="cv-report-detail-row__value">
                            {runtime.lastScheduledExecution
                              ? `${runtime.lastScheduledExecution.trigger} / ${runtime.lastScheduledExecution.operatorName}`
                              : "未记录"}
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>
                  <ReportPushStatusCard
                    actionLabel="保存调度"
                    status={saveStatus}
                    message={saveMessage ?? undefined}
                    idleMessage="尚未保存调度"
                    hideErrorState
                  />
                </div>
              </section>
            ) : null}

          <div className="cv-section-stack cv-report-secondary-stack">
            {selectedChannels.length > 0 ? (
              <section className="cv-panel">
                <div className="cv-panel-header">
                  <div>
                    <h2 className="cv-panel-title">钉钉投递对象</h2>
                  </div>
                </div>
                <div className="cv-section-stack cv-section-stack--tight">
                  {selectedChannels.map((channel) => (
                    <div key={channel.id} className="cv-status-card cv-status-card--compact">
                      <strong>{channel.name}</strong>
                      <div className="cv-muted">{channel.key}</div>
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
                  </div>
                </div>
                <div className="cv-section-stack cv-section-stack--tight">
                  <div className="cv-input">{preview.message}</div>
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
                <div className="cv-section-stack cv-section-stack--tight">
                  {summary.channels.map((item) => (
                    <div key={item.channelId} className="cv-kv cv-status-card cv-status-card--compact">
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
                  </div>
                </div>
                <div className="cv-section-stack cv-section-stack--tight">
                  {executions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="cv-status-card cv-status-card--compact cv-report-execution-card"
                      onClick={() => setSelectedExecution(item)}
                    >
                      <div className="cv-report-execution">
                        <strong>
                          {item.trigger} / {item.status} / {item.operatorName}
                        </strong>
                        <div className={getStatusTone(item.status)}>
                          {getExecutionStatusLabel(item.status)} · {item.startedAt}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
          </div>
        </div>
      ) : null}

      {editOpen && editor?.builder ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (editStatus !== "pending") {
              setEditOpen(false);
            }
          }}
        >
          <div
            className="cv-report-modal cv-report-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-edit-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 id="report-edit-dialog-title" className="cv-panel-title">
                  编辑报表配置
                </h2>
                <p className="cv-panel-description">修改查询来源、字段和默认条件后保存。</p>
              </div>
              <button
                type="button"
                className="cv-secondary-button"
                disabled={editStatus === "pending"}
                onClick={() => setEditOpen(false)}
              >
                关闭
              </button>
            </div>
            <ReportCreateForm
              mode="edit"
              initialValue={{
                reportId: editor.reportId,
                name: editor.name,
                builder: editor.builder
              }}
              instances={sourceInstances}
              databases={sourceDatabases}
              tables={sourceTables}
              columns={sourceColumns}
              isLoadingDatabases={loadingSourceDatabases}
              isLoadingTables={loadingSourceTables}
              isLoadingColumns={loadingSourceColumns}
              isSubmitting={editStatus === "pending"}
              onInstanceChange={handleInstanceChange}
              onDatabaseChange={handleDatabaseChange}
              onLoadColumns={handleLoadColumns}
              onSubmit={handleEditReport}
            />
          </div>
        </div>
      ) : null}

      {scheduleOpen && schedule && workspace ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (saveStatus !== "pending") {
              setScheduleOpen(false);
            }
          }}
        >
          <div
            className="cv-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-schedule-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 id="report-schedule-dialog-title" className="cv-panel-title">
                  编辑调度
                </h2>
                <p className="cv-panel-description">调整 Cron 计划和投递渠道。</p>
              </div>
              <button
                type="button"
                className="cv-secondary-button"
                disabled={saveStatus === "pending"}
                onClick={() => setScheduleOpen(false)}
              >
                关闭
              </button>
            </div>
            <ReportScheduleForm
              initialValue={schedule}
              channels={workspace.channels}
              isSubmitting={saveStatus === "pending"}
              onSubmit={handleSaveSchedule}
            />
          </div>
        </div>
      ) : null}

      {selectedExecution ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedExecution(null)}
        >
          <div
            className="cv-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-execution-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 id="report-execution-dialog-title" className="cv-panel-title">
                  执行记录详情
                </h2>
                <p className="cv-panel-description">
                  {getExecutionTriggerLabel(selectedExecution.trigger)} · {selectedExecution.operatorName}
                </p>
              </div>
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setSelectedExecution(null)}
              >
                关闭
              </button>
            </div>

            <div className="cv-section-stack cv-section-stack--tight">
              <div className="cv-kv">
                <div className="cv-kv-row">
                  <span className="cv-kv-key">状态</span>
                  <span className={`cv-kv-value ${getStatusTone(selectedExecution.status)}`}>
                    {getExecutionStatusLabel(selectedExecution.status)}
                  </span>
                </div>
                <div className="cv-kv-row">
                  <span className="cv-kv-key">开始时间</span>
                  <span className="cv-kv-value">{formatDateTime(selectedExecution.startedAt)}</span>
                </div>
                <div className="cv-kv-row">
                  <span className="cv-kv-key">结束时间</span>
                  <span className="cv-kv-value">{formatDateTime(selectedExecution.endedAt)}</span>
                </div>
                <div className="cv-kv-row">
                  <span className="cv-kv-key">耗时</span>
                  <span className="cv-kv-value">{selectedExecution.durationSeconds}s</span>
                </div>
              </div>

              <section className="cv-status-card cv-status-card--compact">
                <strong>失败原因</strong>
                <div className="cv-muted">
                  {selectedExecution.errorMessage || "本次执行未记录失败原因。"}
                </div>
              </section>

              <section className="cv-section-stack cv-section-stack--tight">
                <strong>渠道结果</strong>
                {selectedExecution.channelResults.length > 0 ? (
                  selectedExecution.channelResults.map((channel) => (
                    <div
                      key={`${selectedExecution.id}-${channel.channelId}`}
                      className="cv-status-card cv-status-card--compact"
                    >
                      <strong>
                        {channel.channelTyp} / #{channel.channelId}
                      </strong>
                      <div className="cv-muted">
                        成功 {channel.success}，失败 {channel.failed}，最近发送 {formatDateTime(channel.lastSentAt)}
                      </div>
                      {(channel.attempts || channel.retryTimes || channel.retryInterval) ? (
                        <div className="cv-muted">
                          尝试 {channel.attempts ?? 0} 次，重试 {channel.retried ?? 0} 次，重试策略 {channel.retryTimes ?? 0} 次 / {channel.retryInterval ?? 0}s
                        </div>
                      ) : null}
                      {channel.errors && channel.errors.length > 0 ? (
                        <div className="cv-report-error-list">
                          {channel.errors.map((error, index) => (
                            <div key={`${channel.channelId}-${index}`} className="cv-muted">
                              {error}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="cv-status-card cv-status-card--compact">
                    <span className="cv-muted">当前执行未记录渠道明细。</span>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {feedbackDialog ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => setFeedbackDialog(null)}
        >
          <div
            className="cv-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-feedback-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 id="report-feedback-dialog-title" className="cv-panel-title">
                  {feedbackDialog.title}
                </h2>
              </div>
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setFeedbackDialog(null)}
              >
                关闭
              </button>
            </div>

            <section className="cv-status-card cv-status-card--compact">
              <strong>错误原因</strong>
              <div className="cv-muted">{feedbackDialog.message}</div>
            </section>
          </div>
        </div>
      ) : null}

      {confirmEditOpen ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => setConfirmEditOpen(false)}
        >
          <div
            className="cv-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-edit-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 id="report-edit-confirm-title" className="cv-panel-title">
                  确认编辑报表
                </h2>
              </div>
            </div>

            <section className="cv-status-card cv-status-card--compact">
              <strong>重要提示</strong>
              <div className="cv-muted">
                编辑后的报表需要重新积累一天数据，无法补充历史数据，建议优先新建报表，不要直接编辑现有报表。
              </div>
            </section>

            <div className="cv-header-actions">
              <button
                type="button"
                className="cv-action-button"
                onClick={() => void handleConfirmOpenEditReport()}
              >
                继续编辑
              </button>
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setConfirmEditOpen(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
