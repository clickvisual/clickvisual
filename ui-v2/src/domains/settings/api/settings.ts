import { client } from "../../../shared/http/client";

export async function syncSystemSchema(): Promise<string> {
  return client.post<string>("/api/v2/base/system/schema-sync", {});
}
