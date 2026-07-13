import { fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { routes } from "../src/app/router";
import {
  buildShareRouteHref,
  buildV2RouteHref,
  getV1Href,
  getV2Href,
  getV2BasePath,
  getPreferredUiVersion,
  getPublicPathLoginRedirectHref,
  normalizePublicPath,
  setPreferredUiVersion
} from "../src/shared/layout/VersionSwitcher";

const VERSION_STORAGE_KEY = "clickvisual-preferred-ui-version";

describe("v2 version switcher", () => {
  it("reads and writes the preferred ui version", () => {
    window.localStorage.clear();

    expect(getPreferredUiVersion()).toBe("v2");

    setPreferredUiVersion("v1");

    expect(getPreferredUiVersion()).toBe("v1");
  });

  it("builds links with the detected v2 base path", () => {
    expect(getV2BasePath("/console/v2/reports")).toBe("/console");
    expect(getV2BasePath("/console/share")).toBe("/console");
    expect(getV1Href("/console/v2/reports")).toBe("/console/query?ui=v1");
    expect(getV1Href("/v2/reports")).toBe("/query?ui=v1");
    expect(getV2Href("/console/query")).toBe("/console/v2/query");
    expect(getV2Href("/query")).toBe("/v2/query");
    expect(buildShareRouteHref(undefined, "/console/v2/query")).toBe("/console/share");
    expect(buildShareRouteHref(undefined, "/console/share")).toBe("/console/share");
    expect(buildShareRouteHref(new URLSearchParams("tid=1"), "/v2/query")).toBe("/share?tid=1");
    const params = new URLSearchParams({ field: "tid", value: "abc" });
    expect(buildV2RouteHref("query/link", params, "/console/v2/query")).toBe(
      "/console/v2/query/link?field=tid&value=abc"
    );
  });

  it("prefers the compiled public path for v2 links", () => {
    const params = new URLSearchParams({ field: "level", value: "30" });

    expect(normalizePublicPath("/mdp/clickvisual/")).toBe("/mdp/clickvisual");
    expect(normalizePublicPath("https://mdp.shimodev.com/clickvisual/")).toBe("/clickvisual");
    expect(getV2BasePath("/v2/query", "/mdp/clickvisual/")).toBe("/mdp/clickvisual");
    expect(getV1Href("/v2/query", "/mdp/clickvisual/")).toBe("/mdp/clickvisual/query?ui=v1");
    expect(buildShareRouteHref(params, "/v2/query", "/mdp/clickvisual/")).toBe(
      "/mdp/clickvisual/share?field=level&value=30"
    );
    expect(buildV2RouteHref("query/link", params, "/v2/query", "/mdp/clickvisual/")).toBe(
      "/mdp/clickvisual/v2/query/link?field=level&value=30"
    );
  });

  it("redirects into the configured public path before rendering", () => {
    expect(getPublicPathLoginRedirectHref("/v2", "/clickvisual/")).toBe(
      "/clickvisual/v2/login"
    );
    expect(getPublicPathLoginRedirectHref("/v2/query", "/clickvisual/")).toBe(
      "/clickvisual/v2/login"
    );
    expect(getPublicPathLoginRedirectHref("/clickvisual/v2", "/clickvisual/")).toBe("");
    expect(getPublicPathLoginRedirectHref("/clickvisual/v2/login", "/clickvisual/")).toBe("");
    expect(getPublicPathLoginRedirectHref("/clickvisual-other/v2", "/clickvisual/")).toBe(
      "/clickvisual/v2/login"
    );
  });

  it("records v2 as preferred version on the report page", async () => {
    window.localStorage.clear();

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/reports/1001"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(
      screen.getByRole("heading", { name: "定时报表" })
    ).toBeInTheDocument();
    await screen.findByRole("list", { name: "报表任务列表" });
    expect(window.localStorage.getItem(VERSION_STORAGE_KEY)).toBe("v2");
  });

  it("uses the query page as the v2 default entry", async () => {
    window.localStorage.clear();

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2"]
    });

    render(<RouterProvider router={memoryRouter} />);

    await screen.findByRole("heading", { name: "日志查询" });
    expect(window.localStorage.getItem(VERSION_STORAGE_KEY)).toBe("v2");
  });

  it("shows a switcher back to v1 using the remembered preference", async () => {
    window.localStorage.setItem(VERSION_STORAGE_KEY, "v1");

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/reports/1001"]
    });

    render(<RouterProvider router={memoryRouter} />);

    await screen.findByRole("list", { name: "报表任务列表" });

    const link = screen.getByRole("link", { name: "返回上次使用的 v1" });

    expect(link).toHaveAttribute(
      "href",
      "/query?ui=v1"
    );
    fireEvent.click(link);
    expect(window.localStorage.getItem(VERSION_STORAGE_KEY)).toBe("v1");
  });

  it("keeps the v1 target correct in the report page context under a subpath", async () => {
    window.localStorage.setItem(VERSION_STORAGE_KEY, "v1");
    window.history.pushState({}, "", "/console/v2/reports/1001");

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/reports/1001"]
    });

    render(<RouterProvider router={memoryRouter} />);

    await screen.findByRole("list", { name: "报表任务列表" });

    const link = screen.getByRole("link", { name: "返回上次使用的 v1" });

    expect(link).toHaveAttribute("href", "/console/query?ui=v1");

    fireEvent.click(link);

    expect(window.localStorage.getItem(VERSION_STORAGE_KEY)).toBe("v1");
  });

  it("keeps the v1 target correct from another shell route", async () => {
    window.localStorage.setItem(VERSION_STORAGE_KEY, "v1");
    window.history.pushState({}, "", "/console/v2/query");

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/query"]
    });

    render(<RouterProvider router={memoryRouter} />);

    await screen.findByRole("heading", { name: "日志查询" });

    const link = screen.getByRole("link", { name: "返回上次使用的 v1" });
    expect(link).toHaveAttribute("href", "/console/query?ui=v1");
  });
});
