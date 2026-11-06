import { getV2BasePath } from "../layout/VersionSwitcher";

interface ApiEnvelope<T> {
  code: number;
  msg: string;
  data: T;
  pagination?: Pagination;
}

export interface Pagination { current: number; pageSize: number; total: number }
export interface PageResult<T> { data: T; pagination: Pagination }

export interface RequestOptions {
  signal?: AbortSignal;
}

function buildApiUrl(path: string) {
  const basePath = getV2BasePath();
  return `${basePath}${path}`;
}

function getLoginHref(payload?: string) {
  const loginParams = new URLSearchParams({ redirect: window.location.pathname + (window.location.search || "") });
  const localLogin = `${getV2BasePath()}/v2/login?${loginParams}`;
  if (payload) {
    try {
      const url = new URL(payload, window.location.origin);
      if (url.pathname.endsWith("/user/login")) {
        return localLogin;
      }
    } catch {
      if (payload.endsWith("/user/login")) {
        return localLogin;
      }
    }
    return payload;
  }
  return localLogin;
}

function redirectToLogin(payload?: string) {
  const href = getLoginHref(payload);
  if (typeof window !== "undefined") {
    window.location.assign(href);
  }
  throw new Error("需要重新登录");
}

async function requestEnvelope<T>(path: string, init: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(buildApiUrl(path), {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  let rawText = "";
  if (typeof response.text === "function") {
    rawText = await response.text();
  } else if (typeof response.json === "function") {
    const fallbackBody = await response.json();
    rawText = JSON.stringify(fallbackBody);
  }
  if (!rawText.trim()) {
    throw new Error(
      response.ok
        ? "接口返回空响应"
        : `接口请求失败（HTTP ${response.status}）`
    );
  }

  let body: ApiEnvelope<T>;
  try {
    body = JSON.parse(rawText) as ApiEnvelope<T>;
  } catch {
    throw new Error(
      response.ok
        ? "接口返回了非 JSON 响应"
        : `接口请求失败（HTTP ${response.status}）`
    );
  }

  if (body.code === 302) {
    redirectToLogin(typeof body.data === "string" ? body.data : undefined);
  }

  if (!response.ok || body.code !== 0) {
    throw new Error(body.msg || `request failed (HTTP ${response.status})`);
  }

  return body;
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  return (await requestEnvelope<T>(path, init)).data;
}

export const client = {
  async getPage<T>(path: string, options?: RequestOptions): Promise<PageResult<T>> {
    const body = await requestEnvelope<T>(path, { method: "GET", signal: options?.signal });
    if (!body.pagination) throw new Error("接口未返回分页信息");
    return { data: body.data, pagination: body.pagination };
  },
  get<T>(path: string, options?: RequestOptions) {
    return requestJson<T>(path, {
      method: "GET",
      signal: options?.signal
    });
  },
  post<T>(path: string, payload: unknown, options?: RequestOptions) {
    return requestJson<T>(path, {
      method: "POST",
      body: JSON.stringify(payload),
      signal: options?.signal
    });
  },
  patch<T>(path: string, payload: unknown, options?: RequestOptions) {
    return requestJson<T>(path, {
      method: "PATCH",
      body: JSON.stringify(payload),
      signal: options?.signal
    });
  },
  put<T>(path: string, payload: unknown, options?: RequestOptions) {
    return requestJson<T>(path, {
      method: "PUT",
      body: JSON.stringify(payload),
      signal: options?.signal
    });
  },
  delete<T>(path: string, payload?: unknown, options?: RequestOptions) {
    return requestJson<T>(path, {
      method: "DELETE",
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: options?.signal
    });
  }
};
