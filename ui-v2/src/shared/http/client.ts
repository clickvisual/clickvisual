import { getV2BasePath } from "../layout/VersionSwitcher";

interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

function buildApiUrl(path: string) {
  const basePath = getV2BasePath();
  return `${basePath}${path}`;
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || body.code !== 0) {
    throw new Error(body.msg || "request failed");
  }

  return body.data;
}

export const client = {
  get<T>(path: string) {
    return requestJson<T>(path, {
      method: "GET"
    });
  },
  post<T>(path: string, payload: unknown) {
    return requestJson<T>(path, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};
