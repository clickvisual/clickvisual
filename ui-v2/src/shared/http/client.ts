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

function getLoginHref(payload?: string) {
  if (payload) {
    return payload;
  }
  return `${getV2BasePath()}/user/login`;
}

function redirectToLogin(payload?: string) {
  const href = getLoginHref(payload);
  if (typeof window !== "undefined") {
    window.location.assign(href);
  }
  throw new Error("需要重新登录");
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
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
  },
  patch<T>(path: string, payload: unknown) {
    return requestJson<T>(path, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  put<T>(path: string, payload: unknown) {
    return requestJson<T>(path, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  delete<T>(path: string, payload?: unknown) {
    return requestJson<T>(path, {
      method: "DELETE",
      body: payload === undefined ? undefined : JSON.stringify(payload)
    });
  }
};
