import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { listQueryManageInstances, updateQueryDatabase } from "../api/query";
import type {
  QuerySourceDatabase,
  QuerySourceInstance,
  QuerySourceTreeTarget
} from "../types/contracts";

interface QueryEditDatabaseModalProps {
  open: boolean;
  instance: QuerySourceInstance | null;
  database: QuerySourceDatabase | null;
  onClose: () => void;
  onSuccess: (target: QuerySourceTreeTarget) => void;
}

function buildInitialState(database: QuerySourceDatabase | null) {
  return {
    cluster: database?.cluster ?? "",
    desc: database?.desc ?? ""
  };
}

export default function QueryEditDatabaseModal({
  open,
  instance,
  database,
  onClose,
  onSuccess
}: QueryEditDatabaseModalProps) {
  const [formState, setFormState] = useState(() => buildInitialState(database));
  const [clusterOptions, setClusterOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open || !instance || !database) {
      setFormState(buildInitialState(database));
      setClusterOptions([]);
      setErrorMessage("");
      return;
    }
    let active = true;
    setFormState(buildInitialState(database));
    setErrorMessage("");
    void listQueryManageInstances()
      .then((instances) => {
        if (!active) {
          return;
        }
        const current = instances.find((item) => item.id === instance.id);
        setClusterOptions(Array.isArray(current?.clusters) ? current.clusters : []);
      })
      .catch(() => {
        if (active) {
          setClusterOptions([]);
        }
      });
    return () => {
      active = false;
    };
  }, [database, instance, open]);

  const requiresCluster = clusterOptions.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!database || !instance || loading) {
      return;
    }
    const desc = formState.desc.trim();
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
      await updateQueryDatabase(database.id, {
        cluster: formState.cluster.trim() || undefined,
        desc
      });
      onSuccess({
        instanceId: instance.id,
        databaseName: database.name
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "编辑数据库失败");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !instance || !database) {
    return null;
  }

  return (
    <div className="cv-report-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="cv-report-modal cv-query-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="query-edit-database-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cv-panel-header">
          <div>
            <h2 id="query-edit-database-title" className="cv-panel-title">
              编辑数据库
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
            <span className="cv-label">数据库</span>
            <input className="cv-input" aria-label="数据库" value={database.name} readOnly />
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
