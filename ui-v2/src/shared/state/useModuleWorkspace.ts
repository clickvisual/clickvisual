import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchModuleWorkspaceSnapshot,
  getModuleWorkspaceMeta,
} from "../mock/moduleWorkspaceApi";
import type {
  ModuleDataScenario,
  ModuleId,
} from "../types/moduleWorkspace";

type WorkspaceLoadStatus = "loading" | "ready" | "empty" | "error";

export function useModuleWorkspace(
  moduleId: ModuleId,
  scenario: ModuleDataScenario
) {
  const meta = useMemo(() => getModuleWorkspaceMeta(moduleId), [moduleId]);
  const [status, setStatus] = useState<WorkspaceLoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setErrorMessage(null);

    fetchModuleWorkspaceSnapshot(moduleId, scenario)
      .then((result) => {
        if (!active) {
          return;
        }

        setStatus(result.hasContent ? "ready" : "empty");
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : meta.stateCopy.errorDescription
        );
      });

    return () => {
      active = false;
    };
  }, [meta.stateCopy.errorDescription, moduleId, reloadToken, scenario]);

  return {
    meta,
    status,
    errorMessage,
    reload,
  };
}
