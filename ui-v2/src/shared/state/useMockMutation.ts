import { useState } from "react";
import type { SubmitOutcome } from "../types/moduleWorkspace";

export type MutationStatus = "idle" | "pending" | "success" | "error";

type UseMockMutationOptions = {
  pendingMessage: string;
  successMessage: string;
  errorMessage: string;
  outcome: SubmitOutcome;
  delayMs?: number;
};

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useMockMutation({
  pendingMessage,
  successMessage,
  errorMessage,
  outcome,
  delayMs = 640,
}: UseMockMutationOptions) {
  const [status, setStatus] = useState<MutationStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setStatus("pending");
    setMessage(pendingMessage);
    await delay(delayMs);

    if (outcome === "error") {
      setStatus("error");
      setMessage(errorMessage);
      throw new Error(errorMessage);
    }

    setStatus("success");
    setMessage(successMessage);
  }

  function reset() {
    setStatus("idle");
    setMessage(null);
  }

  return {
    status,
    message,
    run,
    reset,
  };
}
