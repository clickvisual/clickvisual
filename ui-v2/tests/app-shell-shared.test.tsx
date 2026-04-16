import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import AppShell from "../src/shared/layout/AppShell";

describe("v2 shared shell", () => {
  it("renders shared shell controls with active report workspace", async () => {
    render(
      <MemoryRouter initialEntries={["/v2/reports"]}>
        <Routes>
          <Route
            path="/v2/reports"
            element={
              <AppShell>
                <h1>报表配置</h1>
              </AppShell>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByRole("navigation", { name: "v2 主导航" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "定时报表" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByText("日志查询")).toBeInTheDocument();
    expect(screen.getByTestId("shell-version-switcher")).toHaveClass("cv-version-switcher");
    expect(screen.getByTestId("app-shell-topbar")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("shell-time-range-switcher")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /前往 v1|返回上次使用的 v1/ })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "报表配置" })
    ).toBeInTheDocument();
  });
});
