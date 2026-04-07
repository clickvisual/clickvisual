import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  EmptyState,
  ErrorState,
  LoadingState
} from "../src/shared/state/PageState";

describe("shared page states", () => {
  it("renders loading, empty and error states", () => {
    const { rerender } = render(
      <LoadingState title="加载中" description="请稍候..." />
    );
    expect(screen.getByRole("status", { name: "加载中" })).toBeInTheDocument();
    expect(screen.getByText("请稍候...")).toBeInTheDocument();

    rerender(<EmptyState title="暂无数据" description="请稍后重试" />);
    expect(screen.getByRole("status", { name: "暂无数据" })).toBeInTheDocument();
    expect(screen.getByText("请稍后重试")).toBeInTheDocument();

    rerender(<ErrorState title="加载失败" description="网络错误" />);
    expect(screen.getByRole("alert", { name: "加载失败" })).toBeInTheDocument();
    expect(screen.getByText("网络错误")).toBeInTheDocument();
  });

  it("keeps accessible state roles even when description is omitted", () => {
    const { rerender } = render(<LoadingState title="加载中" />);
    expect(screen.getByRole("status", { name: "加载中" })).toBeInTheDocument();
    expect(screen.queryByText("请稍候...")).not.toBeInTheDocument();

    rerender(<EmptyState title="暂无数据" />);
    expect(screen.getByRole("status", { name: "暂无数据" })).toBeInTheDocument();

    rerender(<ErrorState title="加载失败" />);
    expect(screen.getByRole("alert", { name: "加载失败" })).toBeInTheDocument();
  });
});
