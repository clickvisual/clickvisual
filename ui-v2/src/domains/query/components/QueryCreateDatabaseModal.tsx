import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  createQueryDatabase,
  listQueryExistingDatabases,
  listQueryManageInstances
} from "../api/query";
import type { QuerySourceInstance, QuerySourceTreeTarget } from "../types/contracts";

type DatabaseMode = "create" | "access";

interface QueryCreateDatabaseModalProps {
  open: boolean;
  instance: QuerySourceInstance | null;
  onClose: () => void;
  onSuccess: (target: QuerySourceTreeTarget) => void;
}

function buildInitialState() {
  return {
    mode: "create" as DatabaseMode,
    databaseName: "",
    cluster: "",
    desc: ""
  };
}

export function QueryCreateDatabaseModal({
  open,
  instance,
  onClose,
  onSuccess
}: QueryCreateDatabaseModalProps) {
  const [formState, setFormState] = useState(buildInitialState);
  const [databaseOptions, setDatabaseOptions] = useState<string[]>([]);
  const [clusterOptions, setClusterOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open || !instance) {
      setFormState(buildInitialState());
      setDatabaseOptions([]);
      setClusterOptions([]);
      setErrorMessage("");
      return;
    }
    let active = true;
    setFormState(buildInitialState());
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
  }, [instance, open]);

  const requiresCluster = clusterOptions.length > 0;
  const title = useMemo(
    () => (formState.mode === "create" ? "新增数据库" : "接入已有数据库"),
    [formState.mode]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instance || loading) {
      return;
    }
    const databaseName = formState.databaseName.trim();
    const desc = formState.desc.trim();
    if (!databaseName) {
      setErrorMessage("请输入数据库名");
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
      await createQueryDatabase(instance.id, {
        databaseName,
        cluster: formState.cluster.trim() || undefined,
        desc,
        type: formState.mode === "access" ? 1 : 0
      });
      onSuccess({
        instanceId: instance.id,
        databaseName
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "新增数据库失败");
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
        aria-labelledby="query-create-database-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cv-panel-header">
          <div>
            <h2 id="query-create-database-title" className="cv-panel-title">
              {title}
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

          <label className="cv-form-row">
            <span className="cv-label">操作</span>
              <select
                className="cv-input"
                aria-label="操作"
                value={formState.mode}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  mode: event.target.value as DatabaseMode,
                  databaseName: ""
                }))
              }
            >
              <option value="create">创建数据库</option>
              <option value="access">接入已有数据库</option>
            </select>
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
            {formState.mode === "access" ? (
              <>
                <input
                  className="cv-input"
                  aria-label="数据库"
                  list="query-existing-database-options"
                  value={formState.databaseName}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      databaseName: event.target.value
                    }))
                  }
                  placeholder="选择或输入数据库"
                />
                <datalist id="query-existing-database-options">
                  {databaseOptions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </>
            ) : (
              <input
                className="cv-input"
                aria-label="数据库"
                value={formState.databaseName}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    databaseName: event.target.value
                  }))
                }
                placeholder="输入数据库名"
              />
            )}
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

export default QueryCreateDatabaseModal;
