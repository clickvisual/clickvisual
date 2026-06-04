import { useEffect, useState } from "react";

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

export function getV2BasePath(pathname?: string) {
  const currentPath =
    pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  const v2Index = currentPath.indexOf("/v2");
  if (v2Index < 0) {
    return "";
  }
  return currentPath.slice(0, v2Index);
}

export function getV1Href(pathname?: string) {
  const basePath = getV2BasePath(pathname);
  return `${basePath}/query?ui=v1`;
}

export function getV2Href(pathname?: string) {
  const basePath = getV2BasePath(pathname) || pathname?.replace(/\/query\/?$/, "") || "";
  return `${basePath}/v2/query`;
}

export function buildV2RouteHref(
  routePath: string,
  searchParams?: URLSearchParams,
  pathname?: string
) {
  const normalizedRoutePath = routePath.replace(/^\/+/, "");
  const query = searchParams?.toString();
  return `${getV2BasePath(pathname)}/v2/${normalizedRoutePath}${query ? `?${query}` : ""}`;
}

export default function VersionSwitcher() {
  const [lastPreferredVersion] = useState(getPreferredUiVersion);

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

  const switchLabel =
    lastPreferredVersion === "v1" ? "返回上次使用的 v1" : "前往 v1";

  return (
    <div className="cv-version-switcher" data-testid="shell-version-switcher">
      <span className="cv-version-switcher__label">当前版本：v2</span>
      <a className="cv-version-switcher__link" href={getV1Href()} onClick={handleSwitch}>
        <span aria-hidden="true">↗</span>
        {switchLabel}
      </a>
    </div>
  );
}
