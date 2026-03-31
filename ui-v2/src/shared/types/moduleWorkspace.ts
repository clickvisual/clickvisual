export type ModuleId = "overview" | "query" | "alert" | "settings";

export type ModuleDataScenario = "ready" | "loading" | "empty" | "error";

export type SubmitOutcome = "success" | "error";

export type AiServiceMode = "ready" | "failing" | "disabled";

export type WorkspaceStateCopy = {
  loadingTitle: string;
  loadingDescription: string;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  errorDescription: string;
};

export type StructuredAiAction = {
  id: string;
  label: string;
  description: string;
  successMessage: string;
  failureMessage: string;
};

export type StructuredAiCardConfig = {
  title: string;
  description: string;
  degradedHint: string;
  disabledHint: string;
  actions: StructuredAiAction[];
};

export type ModuleWorkspaceMeta = {
  moduleId: ModuleId;
  moduleLabel: string;
  stateCopy: WorkspaceStateCopy;
  aiCard: StructuredAiCardConfig;
};
