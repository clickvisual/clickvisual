import { client } from "../../../shared/http/client";
import type { OverviewSummary } from "../types/contracts";

export function getOverviewSummary(signal?: AbortSignal): Promise<OverviewSummary> {
  return client.get<OverviewSummary>("/api/v2/overview/summary", { signal });
}
