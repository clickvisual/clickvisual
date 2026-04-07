import { useState } from "react";
import type {
  AiServiceMode,
  ModuleDataScenario,
  SubmitOutcome,
} from "../types/moduleWorkspace";

export function useScenarioHarness() {
  const [dataScenario, setDataScenario] =
    useState<ModuleDataScenario>("ready");
  const [submitOutcome, setSubmitOutcome] =
    useState<SubmitOutcome>("success");
  const [aiMode, setAiMode] = useState<AiServiceMode>("ready");

  return {
    dataScenario,
    setDataScenario,
    submitOutcome,
    setSubmitOutcome,
    aiMode,
    setAiMode,
  };
}
