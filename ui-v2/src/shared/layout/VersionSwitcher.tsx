import { useEffect } from "react";

export const VERSION_STORAGE_KEY = "clickvisual-preferred-ui-version";

export function getPreferredUiVersion() {
  if (typeof window === "undefined") {
    return "v2";
  }
  return window.localStorage.getItem(VERSION_STORAGE_KEY) || "v2";
}

export function setPreferredUiVersion(version: "v1" | "v2") {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(VERSION_STORAGE_KEY, version);
  }
}

export function normalizePublicPath(value?: string) {
  const rawValue = (value || "").trim();
  if (!rawValue || rawValue === "/") {
    return "";
  }
  let pathValue = rawValue;
  try {
    pathValue = new URL(rawValue).pathname;
  } catch {
    // PUBLIC_PATH is usually a path, not a full URL.
  }
  return `/${pathValue.replace(/^\/+|\/+$/g, "")}`;
}

export function getConfiguredPublicPath() {
  return normalizePublicPath(
    typeof __CLICKVISUAL_PUBLIC_PATH__ === "string"
      ? __CLICKVISUAL_PUBLIC_PATH__
      : "",
  );
}

export function getPublicPathLoginRedirectHref(
  pathname?: string,
  configuredPublicPath = getConfiguredPublicPath(),
) {
  const normalizedConfiguredPublicPath =
    normalizePublicPath(configuredPublicPath);
  if (!normalizedConfiguredPublicPath || typeof window === "undefined") {
    return "";
  }
  const currentPath = pathname || window.location.pathname;
  const isInsidePublicPath =
    currentPath === normalizedConfiguredPublicPath ||
    currentPath.startsWith(`${normalizedConfiguredPublicPath}/`);
  if (isInsidePublicPath) {
    return "";
  }
  return `${normalizedConfiguredPublicPath}/v2/login`;
}

export function getV2BasePath(
  pathname?: string,
  configuredPublicPath = getConfiguredPublicPath(),
) {
  const normalizedConfiguredPublicPath =
    normalizePublicPath(configuredPublicPath);
  if (normalizedConfiguredPublicPath) {
    return normalizedConfiguredPublicPath;
  }
  const currentPath =
    pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  const v2Index = currentPath.indexOf("/v2");
  if (v2Index >= 0) {
    return currentPath.slice(0, v2Index);
  }
  const shareIndex = currentPath.indexOf("/share");
  if (shareIndex >= 0) {
    return currentPath.slice(0, shareIndex);
  }
  return "";
}

export function getV1Href(pathname?: string, configuredPublicPath?: string) {
  const basePath = getV2BasePath(pathname, configuredPublicPath);
  return `${basePath}/query?ui=v1`;
}

export function getV2Href(pathname?: string, configuredPublicPath?: string) {
  const basePath =
    getV2BasePath(pathname, configuredPublicPath) ||
    pathname?.replace(/\/query\/?$/, "") ||
    "";
  return `${basePath}/v2/query`;
}

export function buildV2RouteHref(
  routePath: string,
  searchParams?: URLSearchParams,
  pathname?: string,
  configuredPublicPath?: string,
) {
  const normalizedRoutePath = routePath.replace(/^\/+/, "");
  const query = searchParams?.toString();
  return `${getV2BasePath(pathname, configuredPublicPath)}/v2/${normalizedRoutePath}${query ? `?${query}` : ""}`;
}

export function buildShareRouteHref(
  searchParams?: URLSearchParams,
  pathname?: string,
  configuredPublicPath?: string,
) {
  const query = searchParams?.toString();
  return `${getV2BasePath(pathname, configuredPublicPath)}/share${query ? `?${query}` : ""}`;
}

export default function VersionSwitcher() {
  useEffect(() => {
    setPreferredUiVersion("v2");
  }, []);

  const handleSwitch = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setPreferredUiVersion("v1");
    if (!window.navigator.userAgent.includes("jsdom")) {
      window.location.assign(getV1Href());
    }
  };

  return (
    <div className="cv-version-switcher" data-testid="shell-version-switcher">
      <a
        className="cv-version-switcher__link"
        href={getV1Href()}
        onClick={handleSwitch}
        title="切换到 v1"
        aria-label="切换到 v1"
      >
        <span aria-hidden="true">↗</span>
        v1
      </a>
    </div>
  );
}
