import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  accessQueryLogLibrary,
  listQueryExistingDatabases,
  listQueryExistingTables,
  listQueryManageInstances
} from "../api/query";
import type { QuerySourceInstance, QuerySourceTreeTarget } from "../types/contracts";

interface QueryAccessLogLibraryModalProps {
  open: boolean;
  instance: QuerySourceInstance | null;
  initialDatabaseName?: string;
  onClose: () => void;
  onSuccess: (target: QuerySourceTreeTarget) => void;
}

function buildInitialState(databaseName?: string) {
  return {
    databaseName: databaseName ?? "",
    tableName: "",
    timeField: "",
    timeFieldType: "1",
    cluster: "",
    desc: ""
  };
}

export function QueryAccessLogLibraryModal({
  open,
  instance,
  initialDatabaseName,
  onClose,
  onSuccess
}: QueryAccessLogLibraryModalProps) {
  const [formState, setFormState] = useState(() => buildInitialState(initialDatabaseName));
  const [databaseOptions, setDatabaseOptions] = useState<string[]>([]);
  const [tableOptions, setTableOptions] = useState<string[]>([]);
  const [clusterOptions, setClusterOptions] = useState<string[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open || !instance) {
      setFormState(buildInitialState(initialDatabaseName));
      setDatabaseOptions([]);
      setTableOptions([]);
      setClusterOptions([]);
      setTableLoading(false);
      setErrorMessage("");
      return;
    }
    let active = true;
    setFormState(buildInitialState(initialDatabaseName));
    setErrorMessage("");
    void Promise.all([
      listQueryManageInstances().catch(() => []),
      listQueryExistingDatabases(instance.id).catch(() => [])
    ]).then(([instances, databases]) => {
      if (!active) {
        return;
      }
      const current = instances.find((item) => item.id === instance.id);
      setClusterOptions(Array.isArray(current?.clusters) ? current.clusters : []);
      setDatabaseOptions(Array.isArray(databases) ? databases : []);
    });
    return () => {
      active = false;
    };
  }, [initialDatabaseName, instance, open]);

  useEffect(() => {
    if (!open || !instance || !formState.databaseName.trim()) {
      setTableOptions([]);
      setTableLoading(false);
      return;
    }
    let active = true;
    const databaseName = formState.databaseName.trim();
    setTableLoading(true);
    listQueryExistingTables(instance.id, databaseName)
      .then((tables) => {
        if (active) {
          setTableOptions(tables);
        }
      })
      .catch(() => {
        if (active) {
          setTableOptions([]);
        }
      })
      .finally(() => {
        if (active) {
          setTableLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [formState.databaseName, instance, open]);

  const requiresCluster = clusterOptions.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instance || loading) {
      return;
    }
    const databaseName = formState.databaseName.trim();
    const tableName = formState.tableName.trim();
    const desc = formState.desc.trim();
    if (!databaseName) {
      setErrorMessage("请输入数据库名");
      return;
    }
    if (!tableName) {
      setErrorMessage("请输入已有日志表名");
      return;
    }
    if (requiresCluster && !formState.cluster.trim()) {
      setErrorMessage("请选择 cluster");
      return;
    }
    if (!desc) {
      setErrorMessage("请输入描述");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      await accessQueryLogLibrary(instance.id, {
        databaseName,
        tableName,
        timeField: formState.timeField.trim(),
        timeFieldType: Number(formState.timeFieldType),
        cluster: formState.cluster.trim() || undefined,
        desc
      });
      onSuccess({
        instanceId: instance.id,
        databaseName,
        tableName
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "接入已有日志表失败");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !instance) {
    return null;
  }

  return (
    <div className="cv-report-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="cv-report-modal cv-query-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="query-access-log-library-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cv-panel-header">
          <div>
            <h2 id="query-access-log-library-title" className="cv-panel-title">
              接入已有日志表
            </h2>
          </div>
          <button type="button" className="cv-secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>

        <form className="cv-form-grid cv-query-modal__form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="cv-form-row">
            <span className="cv-label">实例</span>
            <input className="cv-input" aria-label="实例" value={instance.name} readOnly />
          </label>

          {requiresCluster ? (
            <label className="cv-form-row">
              <span className="cv-label">Cluster</span>
              <select
                className="cv-input"
                aria-label="Cluster"
                value={formState.cluster}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    cluster: event.target.value
                  }))
                }
              >
                <option value="">选择 cluster</option>
                {clusterOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="cv-form-row">
            <span className="cv-label">数据库</span>
            <input
              className="cv-input"
              aria-label="数据库"
              list="query-access-database-options"
              value={formState.databaseName}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  databaseName: event.target.value
                }))
              }
              placeholder="选择或输入数据库"
            />
            <datalist id="query-access-database-options">
              {databaseOptions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>

          <label className="cv-form-row">
            <span className="cv-label">已有日志表</span>
            <input
              className="cv-input"
              aria-label="已有日志表"
              list="query-access-table-options"
              value={formState.tableName}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  tableName: event.target.value
                }))
              }
              placeholder={tableLoading ? "正在读取已有日志表..." : "选择或输入已有日志表名"}
            />
            <datalist id="query-access-table-options">
              {tableOptions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            {tableOptions.length > 0 ? (
              <span className="cv-muted">已读取 {tableOptions.length} 张表，可直接选择。</span>
            ) : null}
          </label>

          <label className="cv-form-row">
            <span className="cv-label">时间字段</span>
            <input
              className="cv-input"
              aria-label="时间字段"
              value={formState.timeField}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  timeField: event.target.value
                }))
              }
              placeholder="例如 _time"
            />
          </label>

          <label className="cv-form-row">
            <span className="cv-label">时间字段类型</span>
            <select
              className="cv-input"
              aria-label="时间字段类型"
              value={formState.timeFieldType}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  timeFieldType: event.target.value
                }))
              }
            >
              <option value="1">String</option>
              <option value="2">Float</option>
            </select>
          </label>

          <label className="cv-form-row">
            <span className="cv-label">描述</span>
            <textarea
              className="cv-textarea"
              aria-label="描述"
              value={formState.desc}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  desc: event.target.value
                }))
              }
              placeholder="填写用途说明"
            />
          </label>

          {errorMessage ? (
            <div role="alert" className="cv-query-alert">
              {errorMessage}
            </div>
          ) : null}

          <div className="cv-query-modal__footer">
            <button type="button" className="cv-secondary-button" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="cv-action-button" disabled={loading}>
              {loading ? "提交中..." : "确认"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default QueryAccessLogLibraryModal;
