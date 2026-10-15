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

  it.each(["/", "/v2", "/v2/"])("uses Ask as the home page at %s under a deployment prefix", async (path) => {
    const memoryRouter = createMemoryRouter(routes, {
      basename: "/clickvisual",
      initialEntries: [`/clickvisual${path}?source=home`]
    });
    render(<RouterProvider router={memoryRouter} />);
    await screen.findByText("有什么日志问题？");
    expect(memoryRouter.state.location.pathname).toBe("/clickvisual/v2/ask");
    expect(memoryRouter.state.location.search).toBe("?source=home");
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/clickvisual/v2/ask");
  });

  it.each([
    ["", "/v2/ask"],
    ["", "/v2/troubleshoot"],
    ["/clickvisual", "/v2/ask"],
    ["/clickvisual", "/v2/troubleshoot"]
  ])("opens Ask at %s%s and marks its navigation active", async (basename, path) => {
    const memoryRouter = createMemoryRouter(routes, {
      basename: basename || "/",
      initialEntries: [`${basename}${path}`]
    });
    render(<RouterProvider router={memoryRouter} />);
    expect(await screen.findByRole("heading", { name: "日志排查", exact: true })).toBeInTheDocument();
    expect(await screen.findByText("有什么日志问题？")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ask", exact: true })).toHaveAttribute("href", `${basename}/v2/ask`);
    expect(screen.getByRole("link", { name: "Ask", exact: true })).toHaveClass("cv-shell__nav-link--active");
  });

  it.each(["ask", "troubleshoot"])("opens a shared transcript at /v2/%s/share/:token", async (path) => {
    const memoryRouter = createMemoryRouter(routes, { initialEntries: [`/v2/${path}/share/demo`] });
    render(<RouterProvider router={memoryRouter} />);
    expect(await screen.findByText("最近 15 分钟有 3 条超时。")).toBeInTheDocument();
    expect(screen.getByText("只读")).toBeInTheDocument();
    expect(screen.queryByLabelText("现象")).not.toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/v2/ask");
    expect(screen.getByRole("link", { name: "日志" })).toHaveAttribute("href", "/v2/query");
    expect(screen.getByText("ClickVisual")).toBeInTheDocument();
    await screen.findByRole("heading", { name: "总览大盘" });

    const overviewLink = screen.getByRole("link", { name: "总览大盘" });
    expect(overviewLink).toHaveAttribute("aria-current", "page");
    expect(overviewLink.className).toContain("cv-shell__nav-link--active");
    expect(screen.getByRole("link", { name: "日志查询" })).toHaveAttribute(
      "href",
      "/v2/query",
    );
    expect(screen.getByRole("link", { name: "Ask", exact: true })).toHaveAttribute("href", "/v2/ask");
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

  it("opens partner menu on hover and links OfficeDex directly", async () => {
    const memoryRouter = createMemoryRouter(routes, {
      initialEntries: ["/v2/overview"],
    });

    render(<RouterProvider router={memoryRouter} />);

    const officeDexPrimary = screen.getByRole("link", { name: /OfficeDex/ });
    expect(officeDexPrimary).toHaveAttribute("href", "https://officedex.ai/");
    expect(officeDexPrimary).toHaveAttribute("target", "_blank");
    expect(officeDexPrimary).toHaveAttribute("rel", "noopener noreferrer");

    fireEvent.mouseEnter(screen.getByTestId("partner-menu-wrap"));

    const officeDexLink = screen.getByRole("menuitem", { name: /OfficeDex/ });
    expect(officeDexLink).toHaveAttribute("href", "https://officedex.ai/");
    expect(officeDexLink).toHaveAttribute("target", "_blank");
    expect(officeDexLink).toHaveAttribute("rel", "noopener noreferrer");

    const shimoDocsLink = screen.getByRole("menuitem", { name: "ShimoDocs" });
    expect(shimoDocsLink).toHaveAttribute(
      "href",
      "https://github.com/shimodocs/shimodocs",
    );
    expect(shimoDocsLink).toHaveAttribute("target", "_blank");
    expect(shimoDocsLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(shimoDocsLink).toHaveAttribute(
      "title",
      "我们团队最新推出的石墨文档私有化版本5人永久免费版 @ShimoDocs，欢迎了解！",
    );

    expect(
      officeDexLink.compareDocumentPosition(shimoDocsLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
