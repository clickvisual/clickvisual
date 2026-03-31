import { fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { routes } from "../src/app/router";
import {
  getV1Href,
  getV2BasePath,
  getPreferredUiVersion,
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
    expect(getV1Href("/console/v2/reports")).toBe("/console/query");
    expect(getV1Href("/v2/reports")).toBe("/query");
  });

  it("redirects /v2 to the report page and records v2 as preferred version", async () => {
    window.localStorage.clear();

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2"]
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(
      screen.getByRole("heading", { name: "定时报表" })
    ).toBeInTheDocument();
    await screen.findByRole("heading", { name: "报表任务（Mock）" });
    expect(window.localStorage.getItem(VERSION_STORAGE_KEY)).toBe("v2");
  });

  it("shows a switcher back to v1 using the remembered preference", async () => {
    window.localStorage.setItem(VERSION_STORAGE_KEY, "v1");

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/reports"]
    });

    render(<RouterProvider router={memoryRouter} />);

    await screen.findByRole("heading", { name: "报表任务（Mock）" });

    const link = screen.getByRole("link", { name: "返回上次使用的 v1" });

    expect(link).toHaveAttribute(
      "href",
      "/query"
    );
    fireEvent.click(link);
    expect(window.localStorage.getItem(VERSION_STORAGE_KEY)).toBe("v1");
  });

  it("keeps the v1 target correct in the report page context under a subpath", async () => {
    window.localStorage.setItem(VERSION_STORAGE_KEY, "v1");
    window.history.pushState({}, "", "/console/v2/reports");

    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/reports"]
    });

    render(<RouterProvider router={memoryRouter} />);

    await screen.findByRole("heading", { name: "报表任务（Mock）" });

    const link = screen.getByRole("link", { name: "返回上次使用的 v1" });

    expect(link).toHaveAttribute("href", "/console/query");

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
    expect(link).toHaveAttribute("href", "/console/query");
  });
});
