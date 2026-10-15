import { useEffect, useState } from "react";
import SettingsSubnav from "../components/SettingsSubnav";
import {
  listSettingsAIProviders,
  saveSettingsAIProviders,
  testSettingsAIProvider,
  type SettingsAIProvider,
  type SettingsAIProviderDraft,
  type SettingsAIProviderKind
} from "../api/settings";

const PROVIDER_KINDS: Array<{ value: SettingsAIProviderKind; label: string }> = [
  { value: "openai", label: "OpenAI 兼容" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic", label: "Anthropic" }
];
const REASONING_EFFORTS = ["minimal", "low", "medium", "high"];
const PROVIDER_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

function emptyDraft(): SettingsAIProviderDraft {
  return {
    id: "",
    name: "",
    kind: "openai",
    baseURL: "",
    model: "",
    reasoningEffort: "",
    enabled: true,
    apiKey: ""
  };
}

function toDraft(provider: SettingsAIProvider): SettingsAIProviderDraft {
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    baseURL: provider.baseURL,
    model: provider.model,
    reasoningEffort: provider.reasoningEffort,
    enabled: provider.enabled,
    apiKey: ""
  };
}

function kindLabel(kind: string) {
  return PROVIDER_KINDS.find((item) => item.value === kind)?.label || kind;
}

function draftError(draft: SettingsAIProviderDraft, providers: SettingsAIProvider[], editingId: string) {
  const id = draft.id.trim().toLowerCase();
  if (!PROVIDER_KEY_PATTERN.test(id)) {
    return "ID 只能包含小写字母、数字、- 和 _";
  }
  if (providers.some((provider) => provider.id === id && provider.id !== editingId)) {
    return `ID「${id}」已存在`;
  }
  if (!/^https?:\/\/\S+$/.test(draft.baseURL.trim())) {
    return "Base URL 需要以 http:// 或 https:// 开头";
  }
  if (!draft.model.trim()) {
    return "请填写模型名";
  }
  if (!editingId && !draft.apiKey.trim()) {
    return "请填写 API Key";
  }
  return "";
}

export default function SettingsModelsPage() {
  const [providers, setProviders] = useState<SettingsAIProvider[]>([]);
  const [chain, setChain] = useState<string[]>([]);
  const [maxProviders, setMaxProviders] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{ editingId: string; draft: SettingsAIProviderDraft } | null>(null);
  const [testResult, setTestResult] = useState("");
  const [testing, setTesting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SettingsAIProvider | null>(null);

  async function loadPage() {
    setLoading(true);
    setError("");
    try {
      const next = await listSettingsAIProviders();
      setProviders(next.providers || []);
      setChain(next.chain || []);
      setMaxProviders(next.max || 10);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "模型配置加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function persist(next: SettingsAIProviderDraft[], okMessage: string) {
    setSaving(true);
    setError("");
    try {
      const saved = await saveSettingsAIProviders(next);
      setProviders(saved.providers || []);
      setChain(saved.chain || []);
      setMaxProviders(saved.max || maxProviders);
      setMessage(okMessage);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setTestResult("");
    setEditor({ editingId: "", draft: emptyDraft() });
  }

  function openEdit(provider: SettingsAIProvider) {
    setTestResult("");
    setEditor({ editingId: provider.id, draft: toDraft(provider) });
  }

  async function submitEditor() {
    if (!editor) {
      return;
    }
    const draft = {
      ...editor.draft,
      id: editor.draft.id.trim().toLowerCase(),
      name: editor.draft.name.trim(),
      baseURL: editor.draft.baseURL.trim().replace(/\/+$/, ""),
      model: editor.draft.model.trim(),
      apiKey: editor.draft.apiKey.trim(),
      reasoningEffort: editor.draft.kind === "anthropic" ? "" : editor.draft.reasoningEffort
    };
    const invalid = draftError(draft, providers, editor.editingId);
    if (invalid) {
      setTestResult(invalid);
      return;
    }
    const list = providers.map(toDraft);
    const isNew = !editor.editingId;
    if (isNew) {
      list.unshift(draft);
    } else {
      const index = list.findIndex((item) => item.id === editor.editingId);
      list[index] = draft;
    }
    if (await persist(list, isNew ? "已添加，并设为最高优先级" : "模型已保存")) {
      setEditor(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const list = providers.map(toDraft);
    const target = index + direction;
    [list[index], list[target]] = [list[target], list[index]];
    await persist(list, "调用顺序已更新");
  }

  async function toggle(provider: SettingsAIProvider) {
    const list = providers.map(toDraft).map((item) =>
      item.id === provider.id ? { ...item, enabled: !item.enabled } : item
    );
    await persist(list, provider.enabled ? "已停用" : "已启用");
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    const list = providers.filter((item) => item.id !== pendingDelete.id).map(toDraft);
    if (await persist(list, "已删除")) {
      setPendingDelete(null);
    }
  }

  async function runTest(draft: SettingsAIProviderDraft, inline: boolean) {
    setTesting(true);
    setError("");
    try {
      const result = await testSettingsAIProvider(draft);
      const seconds = ((result.latencyMs || 0) / 1000).toFixed(1);
      const text = result.ok
        ? `连接正常，${seconds}s · ${result.reply || "OK"}`
        : `连接失败（${seconds}s）：${result.error || "未知错误"}`;
      if (inline) {
        setTestResult(text);
      } else {
        setMessage(`${draft.name || draft.id}：${text}`);
      }
    } catch (testError) {
      const text = testError instanceof Error ? testError.message : "测试请求失败";
      if (inline) {
        setTestResult(text);
      } else {
        setError(text);
      }
    } finally {
      setTesting(false);
    }
  }

  const chainText = chain
    .map((id) => providers.find((provider) => provider.id === id)?.name || id)
    .join(" → ");

  return (
    <section className="cv-page cv-report-page cv-settings-page cv-ai-provider-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>设置</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">模型配置</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">模型配置</h1>
          <SettingsSubnav />
        </div>
        <div className="cv-header-actions">
          <button type="button" className="cv-secondary-button" onClick={() => void loadPage()} disabled={loading}>
            刷新
          </button>
          <button type="button" className="cv-action-button" onClick={openCreate} disabled={providers.length >= maxProviders}>
            添加模型
          </button>
        </div>
      </header>

      {error ? (
        <section className="cv-settings-banner cv-settings-banner--error">
          <strong>操作失败</strong>
          <span>{error}</span>
        </section>
      ) : null}

      <section className="cv-panel cv-ai-provider-panel">
        <div className="cv-ai-provider-head">
          <h2 className="cv-panel-title">AI 模型</h2>
          <p className="cv-ai-provider-lead">
            {loading
              ? "正在加载模型配置"
              : chainText
                ? `调用顺序 ${chainText}，失败自动切换下一个`
                : "没有可用模型，AI 功能已暂停"}
          </p>
        </div>

        {loading ? (
          <div className="cv-ai-provider-empty">正在加载模型配置...</div>
        ) : providers.length === 0 ? (
          <div className="cv-ai-provider-empty">还没有配置模型。添加后会按列表顺序调用，最多 {maxProviders} 个。</div>
        ) : (
          <ol className="cv-ai-provider-list">
            {providers.map((provider, index) => (
              <li key={provider.id} className={provider.enabled ? "" : "is-off"}>
                <span className="cv-ai-provider-rank" aria-hidden="true">{index + 1}</span>
                <div className="cv-ai-provider-main">
                  <div className="cv-ai-provider-title">
                    <strong>{provider.name}</strong>
                    <span className="cv-ai-provider-id">{provider.id}</span>
                    <span className={`cv-ai-provider-state${provider.enabled ? " is-on" : ""}`}>
                      {provider.enabled ? "启用" : "停用"}
                    </span>
                  </div>
                  <div className="cv-ai-provider-meta">
                    <span>{kindLabel(provider.kind)}</span>
                    <span>{provider.model}</span>
                    <span title={provider.baseURL}>{provider.baseURL}</span>
                    <span>{provider.keySet ? `Key ····${provider.keyHint}` : "未设置 Key"}</span>
                    {provider.reasoningEffort ? <span>推理 {provider.reasoningEffort}</span> : null}
                  </div>
                </div>
                <div className="cv-ai-provider-actions">
                  <button type="button" aria-label={`上移 ${provider.name}`} disabled={saving || index === 0} onClick={() => void move(index, -1)}>
                    上移
                  </button>
                  <button type="button" aria-label={`下移 ${provider.name}`} disabled={saving || index === providers.length - 1} onClick={() => void move(index, 1)}>
                    下移
                  </button>
                  <button type="button" aria-label={`测试 ${provider.name}`} disabled={testing} onClick={() => void runTest(toDraft(provider), false)}>
                    测试
                  </button>
                  <button type="button" aria-label={`编辑 ${provider.name}`} onClick={() => openEdit(provider)}>
                    编辑
                  </button>
                  <button type="button" aria-label={`${provider.enabled ? "停用" : "启用"} ${provider.name}`} disabled={saving} onClick={() => void toggle(provider)}>
                    {provider.enabled ? "停用" : "启用"}
                  </button>
                  <button type="button" aria-label={`删除 ${provider.name}`} onClick={() => setPendingDelete(provider)}>
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {message ? <div className="cv-settings-toast">{message}</div> : null}

      {editor ? (
        <ProviderEditor
          editingId={editor.editingId}
          draft={editor.draft}
          current={providers.find((provider) => provider.id === editor.editingId)}
          saving={saving}
          testing={testing}
          testResult={testResult}
          onChange={(next) => {
            setTestResult("");
            setEditor({ ...editor, draft: { ...editor.draft, ...next } });
          }}
          onClose={() => setEditor(null)}
          onSubmit={() => void submitEditor()}
          onTest={() => void runTest(editor.draft, true)}
        />
      ) : null}

      {pendingDelete ? (
        <div className="cv-report-modal-backdrop" role="presentation" onClick={() => setPendingDelete(null)}>
          <div className="cv-report-modal" role="dialog" aria-label="确认删除模型" onClick={(event) => event.stopPropagation()}>
            <div className="cv-panel-header">
              <h2 className="cv-panel-title">删除模型</h2>
            </div>
            <p className="cv-muted">删除「{pendingDelete.name}」后，调用顺序会立即按剩余模型重排。</p>
            <div className="cv-settings-action-row">
              <button type="button" className="cv-secondary-button" onClick={() => setPendingDelete(null)}>
                取消
              </button>
              <button type="button" className="cv-action-button" onClick={() => void confirmDelete()} disabled={saving}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ProviderEditor({
  editingId,
  draft,
  current,
  saving,
  testing,
  testResult,
  onChange,
  onClose,
  onSubmit,
  onTest
}: {
  editingId: string;
  draft: SettingsAIProviderDraft;
  current?: SettingsAIProvider;
  saving: boolean;
  testing: boolean;
  testResult: string;
  onChange: (next: Partial<SettingsAIProviderDraft>) => void;
  onClose: () => void;
  onSubmit: () => void;
  onTest: () => void;
}) {
  const title = editingId ? `编辑模型 · ${current?.name || editingId}` : "添加模型";
  return (
    <div className="cv-report-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="cv-report-modal cv-query-token-modal" role="dialog" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="cv-panel-header">
          <div>
            <div className="cv-settings-section-eyebrow">Model</div>
            <h2 className="cv-panel-title">{title}</h2>
          </div>
          <button type="button" className="cv-secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="cv-form-grid">
          <label className="cv-form-row">
            <span className="cv-label">名称</span>
            <input className="cv-input" aria-label="模型名称" value={draft.name} maxLength={64} placeholder="例如 Grok" onChange={(event) => onChange({ name: event.target.value })} />
          </label>
          <label className="cv-form-row">
            <span className="cv-label">ID</span>
            <input className="cv-input" aria-label="模型 ID" value={draft.id} maxLength={32} readOnly={Boolean(editingId)} placeholder="例如 grok" onChange={(event) => onChange({ id: event.target.value })} />
          </label>
          <label className="cv-form-row">
            <span className="cv-label">协议</span>
            <select className="cv-input" aria-label="模型协议" value={draft.kind} onChange={(event) => onChange({ kind: event.target.value as SettingsAIProviderKind })}>
              {PROVIDER_KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </label>
          <label className="cv-form-row">
            <span className="cv-label">Base URL</span>
            <input className="cv-input" aria-label="模型 Base URL" value={draft.baseURL} placeholder="https://api.openai.com/v1" onChange={(event) => onChange({ baseURL: event.target.value })} />
          </label>
          <label className="cv-form-row">
            <span className="cv-label">模型</span>
            <input className="cv-input" aria-label="模型名" value={draft.model} maxLength={128} placeholder="gpt-4o-mini" onChange={(event) => onChange({ model: event.target.value })} />
          </label>
          {draft.kind !== "anthropic" ? (
            <label className="cv-form-row">
              <span className="cv-label">推理强度</span>
              <select className="cv-input" aria-label="推理强度" value={draft.reasoningEffort} onChange={(event) => onChange({ reasoningEffort: event.target.value })}>
                <option value="">模型默认</option>
                {REASONING_EFFORTS.map((effort) => (
                  <option key={effort} value={effort}>
                    {effort}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="cv-form-row">
            <span className="cv-label">API Key</span>
            <input
              className="cv-input"
              type="password"
              aria-label="模型 API Key"
              value={draft.apiKey}
              autoComplete="off"
              placeholder={current?.keySet ? `已设置 ····${current.keyHint}，留空保持不变` : "sk-..."}
              onChange={(event) => onChange({ apiKey: event.target.value })}
            />
          </label>
          <label className="cv-form-row">
            <span className="cv-label">状态</span>
            <select className="cv-input" aria-label="模型状态" value={draft.enabled ? "1" : "0"} onChange={(event) => onChange({ enabled: event.target.value === "1" })}>
              <option value="1">启用</option>
              <option value="0">停用</option>
            </select>
          </label>
        </div>
        {testResult ? <p className="cv-muted">{testResult}</p> : null}
        <div className="cv-settings-action-row">
          <button type="button" className="cv-secondary-button" onClick={onTest} disabled={testing}>
            {testing ? "测试中" : "测试连接"}
          </button>
          <button type="button" className="cv-secondary-button" onClick={onClose}>
            取消
          </button>
          <button type="button" className="cv-action-button" onClick={onSubmit} disabled={saving}>
            {saving ? "保存中" : "保存"}
          </button>
        </div>
      </section>
    </div>
  );
}
