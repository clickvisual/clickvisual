import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routes } from "../src/app/router";
describe("v2 app shell", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders real module navigation entries", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/overview"],
    });

    render(<RouterProvider router={memoryRouter} />);

    expect(
      screen.getByRole("navigation", { name: "v2 主导航" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-nav")).toHaveClass("cv-shell__nav");
    expect(screen.getByTestId("app-shell-topbar")).toHaveClass(
      "cv-shell__topbar",
    );
    expect(screen.getByText("ClickVisual")).toBeInTheDocument();
    await screen.findByRole("heading", { name: "总览大盘" });

    const overviewLink = screen.getByRole("link", { name: "总览大盘" });
    expect(overviewLink).toHaveAttribute("aria-current", "page");
    expect(overviewLink.className).toContain("cv-shell__nav-link--active");
    expect(screen.getByRole("link", { name: "日志查询" })).toHaveAttribute(
      "href",
      "/v2/query",
    );
    expect(screen.getByRole("link", { name: "定时报表" })).toHaveAttribute(
      "href",
      "/v2/reports",
    );
    expect(screen.getByRole("link", { name: "告警中心" })).toHaveAttribute(
      "href",
      "/v2/alerts/rules",
    );
    expect(screen.getByRole("link", { name: "配置中心" })).toHaveAttribute(
      "href",
      "/v2/settings/datasource",
    );
    expect(screen.getByRole("link", { name: "权限中心" })).toHaveAttribute(
      "href",
      "/v2/permission/users",
    );
    expect(screen.getByTestId("shell-version-switcher")).toBeInTheDocument();
  });

  it("shows the ShimoDocs tooltip on hover", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/overview"],
    });

    render(<RouterProvider router={memoryRouter} />);

    const shimoDocsLink = screen.getByRole("link", {
      name: "我们团队最新推出的石墨文档私有化版本5人永久免费版 @ShimoDocs，欢迎了解！",
    });
    expect(shimoDocsLink).toHaveAttribute(
      "href",
      "https://github.com/shimodocs/shimodocs",
    );
    expect(shimoDocsLink).toHaveAttribute("target", "_blank");
    expect(shimoDocsLink).toHaveAttribute("rel", "noopener noreferrer");

    fireEvent.mouseOver(shimoDocsLink);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "我们团队最新推出的石墨文档私有化版本5人永久免费版 @ShimoDocs，欢迎了解！",
    );
  });
});
