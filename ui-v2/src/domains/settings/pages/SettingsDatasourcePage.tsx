import { useEffect, useState } from "react";
import ModuleRuntimeGate, {
  useModuleRuntimeState
} from "../../../shared/components/ModuleRuntimeState";
import {
  createSettingsAlarmChannel,
  createSettingsDatasource,
  deleteSettingsAlarmChannel,
  deleteSettingsDatasource,
  getSettingsAlarmChannel,
  getSettingsDatasource,
  listSettingsAlarmChannels,
  listSettingsDatasources,
  sendSettingsAlarmChannelTest,
  syncSystemSchema,
  testSettingsDatasource,
  updateSettingsAlarmChannel,
  updateSettingsDatasource,
  type SettingsAlarmChannel,
  type SettingsAlarmChannelPayload,
  type SettingsDatasourceItem,
  type SettingsDatasourcePayload
} from "../api/settings";

type FeedbackDialogState = {
  title: string;
  message: string;
};

type ConfirmDeleteState =
  | {
      type: "datasource";
      id: number;
      name: string;
    }
  | {
      type: "channel";
      id: number;
      name: string;
    };

type DatasourceModalState = {
  mode: "create" | "edit";
  id?: number;
  title: string;
};

type ChannelModalState = {
  mode: "create" | "edit";
  id?: number;
  title: string;
};

type DatasourceFormState = SettingsDatasourcePayload;
type ChannelFormState = SettingsAlarmChannelPayload;

function datasourceKindLabel(value: string) {
  switch (value) {
    case "ch":
      return "ClickHouse";
    case "databend":
      return "Databend";
    case "agent":
      return "Agent";
    default:
      return value || "-";
  }
}

function channelTypeLabel(value: number) {
  switch (value) {
    case 1:
      return "DingTalk";
    case 2:
      return "WeCom";
    case 3:
      return "Feishu";
    case 4:
      return "Slack";
    case 5:
      return "Webhook";
    case 6:
      return "Telegram";
    default:
      return `类型 ${value}`;
  }
}

function trimPayload<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload };
  Object.keys(next).forEach((key) => {
    const value = next[key];
    if (typeof value === "string") {
      next[key] = value.trim() as T[keyof T];
    }
  });
  return next;
}

function emptyDatasourceForm(): DatasourceFormState {
  return {
    name: "",
    datasource: "ch",
    dsn: "",
    desc: ""
  };
}

function emptyChannelForm(): ChannelFormState {
  return {
    name: "",
    key: "",
    typ: 1
  };
}

function GuideList({ items }: { items: string[] }) {
  return (
    <div className="cv-settings-guide-list">
      {items.map((item, index) => (
        <div key={item} className="cv-settings-guide-item">
          <strong>{index + 1}</strong>
          <span className="cv-muted">{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function SettingsDatasourcePage() {
  const { viewState } = useModuleRuntimeState();
  const [loading, setLoading] = useState(true);
  const [datasources, setDatasources] = useState<SettingsDatasourceItem[]>([]);
  const [channels, setChannels] = useState<SettingsAlarmChannel[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialogState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);
  const [datasourceModal, setDatasourceModal] = useState<DatasourceModalState | null>(null);
  const [channelModal, setChannelModal] = useState<ChannelModalState | null>(null);
  const [datasourceForm, setDatasourceForm] = useState<DatasourceFormState>(emptyDatasourceForm);
  const [channelForm, setChannelForm] = useState<ChannelFormState>(emptyChannelForm);
  const [savingDatasource, setSavingDatasource] = useState(false);
  const [testingDatasource, setTestingDatasource] = useState(false);
  const [savingChannel, setSavingChannel] = useState(false);
  const [testingChannel, setTestingChannel] = useState(false);

  async function loadSettings() {
    setLoading(true);
    try {
      const [nextDatasources, nextChannels] = await Promise.all([
        listSettingsDatasources(),
        listSettingsAlarmChannels()
      ]);
      setDatasources(nextDatasources);
      setChannels(nextChannels);
    } catch (error) {
      setFeedbackDialog({
        title: "配置数据加载失败",
        message: error instanceof Error ? error.message : "请稍后重试"
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function handleSyncSystemSchema() {
    setSyncStatus("pending");
    setSyncMessage(null);
    try {
      const message = await syncSystemSchema();
      setSyncStatus("success");
      setSyncMessage(message || "数据结构同步完成");
      setConfirmSyncOpen(false);
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(error instanceof Error ? error.message : "数据结构同步失败");
      setConfirmSyncOpen(false);
    }
  }

  function openDatasourceCreate() {
    setDatasourceForm(emptyDatasourceForm());
    setDatasourceModal({
      mode: "create",
      title: "新增数据源"
    });
  }

  async function openDatasourceEdit(instanceId: number) {
    try {
      const detail = await getSettingsDatasource(instanceId);
      setDatasourceForm({
        name: detail.name || "",
        datasource: detail.datasource || "ch",
        dsn: detail.dsn || "",
        desc: detail.desc || ""
      });
      setDatasourceModal({
        mode: "edit",
        id: instanceId,
        title: "编辑数据源"
      });
    } catch (error) {
      setFeedbackDialog({
        title: "获取数据源详情失败",
        message: error instanceof Error ? error.message : "请稍后重试"
      });
    }
  }

  async function openChannelEdit(channelId: number) {
    try {
      const detail = await getSettingsAlarmChannel(channelId);
      setChannelForm({
        name: detail.name || "",
        key: detail.key || "",
        typ: detail.typ || 1
      });
      setChannelModal({
        mode: "edit",
        id: channelId,
        title: "编辑通知渠道"
      });
    } catch (error) {
      setFeedbackDialog({
        title: "获取渠道详情失败",
        message: error instanceof Error ? error.message : "请稍后重试"
      });
    }
  }

  function openChannelCreate() {
    setChannelForm(emptyChannelForm());
    setChannelModal({
      mode: "create",
      title: "新增 DingTalk 通知"
    });
  }

  async function handleSaveDatasource() {
    const payload = trimPayload(datasourceForm);
    if (!payload.name || !payload.datasource || !payload.dsn) {
      setFeedbackDialog({
        title: "数据源信息不完整",
        message: "请填写数据源名称、类型和 DSN。"
      });
      return;
    }
    setSavingDatasource(true);
    try {
      if (datasourceModal?.mode === "edit" && datasourceModal.id) {
        await updateSettingsDatasource(datasourceModal.id, payload);
      } else {
        await createSettingsDatasource(payload);
      }
      setDatasourceModal(null);
      await loadSettings();
    } catch (error) {
      setFeedbackDialog({
        title: "保存数据源失败",
        message: error instanceof Error ? error.message : "请稍后重试"
      });
    } finally {
      setSavingDatasource(false);
    }
  }

  async function handleTestDatasource() {
    const payload = trimPayload(datasourceForm);
    if (!payload.datasource || !payload.dsn) {
      setFeedbackDialog({
        title: "无法测试连接",
        message: "请先填写数据源类型和 DSN。"
      });
      return;
    }
    setTestingDatasource(true);
    try {
      const message = await testSettingsDatasource({
        datasource: payload.datasource,
        dsn: payload.dsn
      });
      setFeedbackDialog({
        title: "连接测试成功",
        message: message || "数据源连接正常"
      });
    } catch (error) {
      setFeedbackDialog({
        title: "连接测试失败",
        message: error instanceof Error ? error.message : "请检查 DSN"
      });
    } finally {
      setTestingDatasource(false);
    }
  }

  async function handleSaveChannel() {
    const payload = trimPayload(channelForm);
    if (!payload.name || !payload.key) {
      setFeedbackDialog({
        title: "通知渠道信息不完整",
        message: "请填写渠道名称和 Webhook 地址。"
      });
      return;
    }
    setSavingChannel(true);
    try {
      if (channelModal?.mode === "edit" && channelModal.id) {
        await updateSettingsAlarmChannel(channelModal.id, payload);
      } else {
        await createSettingsAlarmChannel(payload);
      }
      setChannelModal(null);
      await loadSettings();
    } catch (error) {
      setFeedbackDialog({
        title: "保存通知渠道失败",
        message: error instanceof Error ? error.message : "请稍后重试"
      });
    } finally {
      setSavingChannel(false);
    }
  }

  async function handleTestChannel() {
    const payload = trimPayload(channelForm);
    if (!payload.name || !payload.key) {
      setFeedbackDialog({
        title: "无法发送测试消息",
        message: "请先填写渠道名称和 Webhook 地址。"
      });
      return;
    }
    setTestingChannel(true);
    try {
      const message = await sendSettingsAlarmChannelTest(payload);
      setFeedbackDialog({
        title: "测试消息发送成功",
        message: message || "请到目标群确认是否收到测试消息"
      });
    } catch (error) {
      setFeedbackDialog({
        title: "测试消息发送失败",
        message: error instanceof Error ? error.message : "请检查 Webhook 配置"
      });
    } finally {
      setTestingChannel(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) {
      return;
    }
    try {
      if (confirmDelete.type === "datasource") {
        await deleteSettingsDatasource(confirmDelete.id);
      } else {
        await deleteSettingsAlarmChannel(confirmDelete.id);
      }
      setConfirmDelete(null);
      await loadSettings();
    } catch (error) {
      setFeedbackDialog({
        title: "删除失败",
        message: error instanceof Error ? error.message : "请稍后重试"
      });
    }
  }

  const dingtalkChannels = channels.filter((item) => item.typ === 1);
  const datasourceErrorCount = datasources.filter((item) => item.error).length;

  return (
    <section className="cv-page cv-report-page cv-settings-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>设置</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">配置中心</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">配置中心</h1>
        </div>
        <div className="cv-header-actions">
          <button type="button" className="cv-action-button" onClick={openDatasourceCreate}>
            新增数据源
          </button>
          <button type="button" className="cv-secondary-button" onClick={openChannelCreate}>
            新增 DingTalk
          </button>
          <button
            type="button"
            className="cv-secondary-button"
            onClick={() => setConfirmSyncOpen(true)}
          >
            手动同步数据结构
          </button>
        </div>
      </header>

      <section className="cv-settings-stats">
        <div className="cv-settings-stat">
          <span className="cv-settings-stat__label">数据源</span>
          <strong className="cv-settings-stat__value">{datasources.length}</strong>
          <span className="cv-muted">查询 / 报表 / 告警</span>
        </div>
        <div className="cv-settings-stat">
          <span className="cv-settings-stat__label">DingTalk 通知</span>
          <strong className="cv-settings-stat__value">{dingtalkChannels.length}</strong>
          <span className="cv-muted">可投递</span>
        </div>
        <div className="cv-settings-stat">
          <span className="cv-settings-stat__label">异常连接</span>
          <strong className="cv-settings-stat__value">{datasourceErrorCount}</strong>
          <span className="cv-muted">待处理</span>
        </div>
        <div className="cv-settings-stat">
          <span className="cv-settings-stat__label">结构同步</span>
          <strong className="cv-settings-stat__value">
            {syncStatus === "success" ? "已完成" : syncStatus === "error" ? "失败" : "待执行"}
          </strong>
          <span className="cv-muted">结构变更后执行</span>
        </div>
      </section>

      {syncMessage ? (
        <section className={`cv-settings-banner ${syncStatus === "error" ? "cv-settings-banner--error" : ""}`}>
          <strong>{syncStatus === "error" ? "同步失败" : "同步结果"}</strong>
          <span>{syncMessage}</span>
        </section>
      ) : null}

      <ModuleRuntimeGate
        viewState={viewState}
        loadingTitle="配置中心加载中"
        emptyTitle="暂无配置数据"
        errorTitle="配置中心暂不可用"
      >
        <div className="cv-settings-layout">
          <div className="cv-settings-main">
            <section className="cv-panel cv-settings-panel">
              <div className="cv-panel-header cv-settings-panel__header">
                <div>
                  <div className="cv-settings-section-eyebrow">Datasource</div>
                  <h2 className="cv-panel-title">数据源</h2>
                </div>
                <div className="cv-settings-section-meta">
                  <span className="cv-settings-chip">{datasources.length} 个实例</span>
                  <button type="button" className="cv-action-button" onClick={openDatasourceCreate}>
                    新增
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="cv-settings-empty">
                  <span className="cv-muted">数据源列表加载中...</span>
                </div>
              ) : datasources.length > 0 ? (
                <div className="cv-table-wrap cv-table-wrap--compact">
                  <table className="cv-table cv-settings-table">
                    <thead>
                      <tr>
                        <th>名称</th>
                        <th>类型</th>
                        <th>模式</th>
                        <th>集群</th>
                        <th>说明</th>
                        <th>状态</th>
                        <th style={{ textAlign: "right" }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datasources.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name}</strong>
                            <div className="cv-muted">ID #{item.id}</div>
                          </td>
                          <td>{datasourceKindLabel(item.datasource)}</td>
                          <td>{item.mode === 1 ? "集群" : "单机"}</td>
                          <td>
                            {item.clusters.length > 0 ? (
                              <div className="cv-settings-chip-row">
                                {item.clusters.map((cluster) => (
                                  <span
                                    key={cluster}
                                    className="cv-settings-chip cv-settings-chip--soft cv-settings-chip--truncate"
                                    title={cluster}
                                  >
                                    {cluster}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="cv-muted">-</span>
                            )}
                          </td>
                          <td>
                            <div
                              className="cv-settings-truncate"
                              title={item.desc || undefined}
                            >
                              {item.desc || "-"}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`cv-settings-status ${
                                item.error ? "cv-settings-status--error" : "cv-settings-status--ok"
                              }`}
                            >
                              {item.error ? "异常" : "正常"}
                            </span>
                            <div className="cv-muted">{item.error || "连接可用"}</div>
                          </td>
                          <td>
                            <div className="cv-settings-table-actions">
                              <button
                                type="button"
                                className="cv-secondary-button"
                                onClick={() => void openDatasourceEdit(item.id)}
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                className="cv-secondary-button"
                                onClick={() =>
                                  setConfirmDelete({
                                    type: "datasource",
                                    id: item.id,
                                    name: item.name
                                  })
                                }
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="cv-settings-empty">
                  <strong>还没有数据源</strong>
                  <span className="cv-muted">先新增一个 ClickHouse 实例。</span>
                </div>
              )}
            </section>

            <section className="cv-panel cv-settings-panel">
              <div className="cv-panel-header cv-settings-panel__header">
                <div>
                  <div className="cv-settings-section-eyebrow">Notification</div>
                  <h2 className="cv-panel-title">DingTalk 通知</h2>
                </div>
                <div className="cv-settings-section-meta">
                  <span className="cv-settings-chip">{dingtalkChannels.length} 个渠道</span>
                  <button type="button" className="cv-action-button" onClick={openChannelCreate}>
                    新增
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="cv-settings-empty">
                  <span className="cv-muted">通知渠道列表加载中...</span>
                </div>
              ) : dingtalkChannels.length > 0 ? (
                <div className="cv-table-wrap cv-table-wrap--compact">
                  <table className="cv-table cv-settings-table">
                    <thead>
                      <tr>
                        <th>名称</th>
                        <th>类型</th>
                        <th>Webhook</th>
                        <th style={{ textAlign: "right" }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dingtalkChannels.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.name}</strong>
                            <div className="cv-muted">创建人 #{item.uid}</div>
                          </td>
                          <td>{channelTypeLabel(item.typ)}</td>
                          <td>
                            <code
                              className="cv-code cv-settings-inline-code"
                              title={item.key}
                            >
                              {item.key}
                            </code>
                          </td>
                          <td>
                            <div className="cv-settings-table-actions">
                              <button
                                type="button"
                                className="cv-secondary-button"
                                onClick={() => void openChannelEdit(item.id)}
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                className="cv-secondary-button"
                                onClick={() =>
                                  setConfirmDelete({
                                    type: "channel",
                                    id: item.id,
                                    name: item.name
                                  })
                                }
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="cv-settings-empty">
                  <strong>还没有 DingTalk 通知对象</strong>
                  <span className="cv-muted">先补一个机器人 Webhook。</span>
                </div>
              )}
            </section>
          </div>

          <div className="cv-settings-side">
            <section className="cv-panel cv-settings-panel cv-settings-panel--aside">
              <div className="cv-panel-header cv-settings-panel__header">
                <div>
                  <div className="cv-settings-section-eyebrow">Status</div>
                  <h2 className="cv-panel-title">系统状态</h2>
                </div>
              </div>
              <div className="cv-settings-status-grid">
                <div className="cv-settings-status-card">
                  <span className="cv-settings-status-card__label">数据源</span>
                  <strong className="cv-settings-status-card__value">{datasources.length}</strong>
                  <span className="cv-settings-status-card__meta">
                    异常 {datasourceErrorCount}
                  </span>
                </div>
                <div className="cv-settings-status-card">
                  <span className="cv-settings-status-card__label">DingTalk</span>
                  <strong className="cv-settings-status-card__value">{dingtalkChannels.length}</strong>
                  <span className="cv-settings-status-card__meta">
                    可用于投递
                  </span>
                </div>
              </div>
              <div className="cv-settings-summary-list">
                <div className="cv-settings-summary-item">
                  <strong>结构同步</strong>
                  <span className="cv-muted">
                    {syncStatus === "success"
                      ? "最近一次已完成。"
                      : syncStatus === "error"
                        ? "最近一次失败。"
                        : "尚未执行。"}
                  </span>
                </div>
                <div className="cv-settings-summary-item">
                  <strong>当前状态</strong>
                  <span className="cv-muted">
                    {datasourceErrorCount > 0
                      ? "存在异常数据源。"
                      : dingtalkChannels.length === 0
                        ? "缺少可投递渠道。"
                        : "可以继续使用。"}
                  </span>
                </div>
              </div>
            </section>

            <section className="cv-panel cv-settings-panel cv-settings-panel--aside">
              <div className="cv-panel-header cv-settings-panel__header">
                <div>
                  <div className="cv-settings-section-eyebrow">Tips</div>
                  <h2 className="cv-panel-title">操作提示</h2>
                </div>
              </div>
              <GuideList
                items={[
                  "数据源先测通再保存。",
                  "Webhook 可先发测试消息。",
                  "结构变更后手动同步一次。"
                ]}
              />
            </section>
          </div>
        </div>
      </ModuleRuntimeGate>

      {datasourceModal ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => setDatasourceModal(null)}
        >
          <div
            className="cv-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-datasource-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 id="settings-datasource-modal-title" className="cv-panel-title">
                  {datasourceModal.title}
                </h2>
              </div>
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setDatasourceModal(null)}
              >
                关闭
              </button>
            </div>

            <div className="cv-form-grid">
              <label className="cv-form-row">
                <span>数据源名称</span>
                <input
                  className="cv-input"
                  value={datasourceForm.name}
                  onChange={(event) =>
                    setDatasourceForm((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  placeholder="例如：生产 ClickHouse"
                />
              </label>

              <label className="cv-form-row">
                <span>数据源类型</span>
                <select
                  className="cv-input"
                  value={datasourceForm.datasource}
                  onChange={(event) =>
                    setDatasourceForm((current) => ({
                      ...current,
                      datasource: event.target.value
                    }))
                  }
                >
                  <option value="ch">ClickHouse</option>
                  <option value="databend">Databend</option>
                  <option value="agent">Agent</option>
                </select>
              </label>

              <label className="cv-form-row">
                <span>DSN</span>
                <textarea
                  className="cv-textarea"
                  rows={5}
                  value={datasourceForm.dsn}
                  onChange={(event) =>
                    setDatasourceForm((current) => ({
                      ...current,
                      dsn: event.target.value
                    }))
                  }
                  placeholder="请填写完整连接串"
                />
              </label>

              <label className="cv-form-row">
                <span>说明</span>
                <input
                  className="cv-input"
                  value={datasourceForm.desc}
                  onChange={(event) =>
                    setDatasourceForm((current) => ({
                      ...current,
                      desc: event.target.value
                    }))
                  }
                  placeholder="可以填写用途、环境、负责人"
                />
              </label>
            </div>

            <div className="cv-header-actions" style={{ marginTop: 18 }}>
              <button
                type="button"
                className="cv-action-button"
                disabled={savingDatasource}
                onClick={() => void handleSaveDatasource()}
              >
                {savingDatasource ? "保存中..." : "保存数据源"}
              </button>
              <button
                type="button"
                className="cv-secondary-button"
                disabled={testingDatasource}
                onClick={() => void handleTestDatasource()}
              >
                {testingDatasource ? "测试中..." : "测试连接"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {channelModal ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => setChannelModal(null)}
        >
          <div
            className="cv-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-channel-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 id="settings-channel-modal-title" className="cv-panel-title">
                  {channelModal.title}
                </h2>
              </div>
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setChannelModal(null)}
              >
                关闭
              </button>
            </div>

            <div className="cv-form-grid">
              <label className="cv-form-row">
                <span>渠道名称</span>
                <input
                  className="cv-input"
                  value={channelForm.name}
                  onChange={(event) =>
                    setChannelForm((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  placeholder="例如：日报推送群"
                />
              </label>

              <label className="cv-form-row">
                <span>通知类型</span>
                <select
                  className="cv-input"
                  value={channelForm.typ}
                  onChange={(event) =>
                    setChannelForm((current) => ({
                      ...current,
                      typ: Number(event.target.value)
                    }))
                  }
                >
                  <option value={1}>DingTalk</option>
                </select>
              </label>

              <label className="cv-form-row">
                <span>Webhook 地址</span>
                <textarea
                  className="cv-textarea"
                  rows={4}
                  value={channelForm.key}
                  onChange={(event) =>
                    setChannelForm((current) => ({
                      ...current,
                      key: event.target.value
                    }))
                  }
                  placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                />
              </label>
            </div>

            <div className="cv-header-actions" style={{ marginTop: 18 }}>
              <button
                type="button"
                className="cv-action-button"
                disabled={savingChannel}
                onClick={() => void handleSaveChannel()}
              >
                {savingChannel ? "保存中..." : "保存渠道"}
              </button>
              <button
                type="button"
                className="cv-secondary-button"
                disabled={testingChannel}
                onClick={() => void handleTestChannel()}
              >
                {testingChannel ? "发送中..." : "发送测试消息"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmSyncOpen ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => setConfirmSyncOpen(false)}
        >
          <div
            className="cv-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-sync-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 id="settings-sync-confirm-title" className="cv-panel-title">
                  确认同步数据结构
                </h2>
              </div>
            </div>

            <section className="cv-status-card cv-status-card--compact">
              <strong>执行条件</strong>
              <span className="cv-muted">新增数据源、升级或结构变化后执行。</span>
            </section>

            <div className="cv-header-actions" style={{ marginTop: 18 }}>
              <button
                type="button"
                className="cv-action-button"
                disabled={syncStatus === "pending"}
                onClick={() => void handleSyncSystemSchema()}
              >
                {syncStatus === "pending" ? "同步中..." : "开始同步"}
              </button>
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setConfirmSyncOpen(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div
          className="cv-report-modal-backdrop"
          role="presentation"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="cv-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-delete-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 id="settings-delete-confirm-title" className="cv-panel-title">
                  确认删除
                </h2>
              </div>
            </div>

            <section className="cv-status-card cv-status-card--compact">
              <strong>删除对象</strong>
              <span className="cv-muted">
                {confirmDelete.type === "datasource" ? "数据源" : "通知渠道"}：{confirmDelete.name}
              </span>
            </section>

            <div className="cv-header-actions" style={{ marginTop: 18 }}>
              <button type="button" className="cv-action-button" onClick={() => void handleDeleteConfirmed()}>
                确认删除
              </button>
              <button
                type="button"
                className="cv-secondary-button"
                onClick={() => setConfirmDelete(null)}
              >
                取消
              </button>
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
            aria-labelledby="settings-feedback-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cv-panel-header">
              <div>
                <h2 id="settings-feedback-title" className="cv-panel-title">
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
              <strong>详情</strong>
              <span className="cv-muted">{feedbackDialog.message}</span>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
