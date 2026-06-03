import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SettingsDatasourcePage from "../src/domains/settings/pages/SettingsDatasourcePage";

describe("settings ai config", () => {
  it("loads masked ai config and supports save plus connectivity test", async () => {
    render(
      <MemoryRouter>
        <SettingsDatasourcePage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "统一 AI 配置" })).toBeInTheDocument();
    expect(screen.getByLabelText("AI 模型")).toHaveValue("gpt-4o-mini");
    expect(screen.getByText("已配置")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("AI 模型"), {
      target: { value: "gpt-5.4-mini" }
    });
    fireEvent.click(screen.getByRole("button", { name: "保存 AI 配置" }));

    expect(await screen.findByRole("heading", { name: "AI 配置已保存" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "AI 配置已保存" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "测试连通性" }));
    expect(await screen.findByRole("heading", { name: "AI 连通性正常" })).toBeInTheDocument();
    expect(screen.getByText(/gpt-4o-mini/)).toBeInTheDocument();
  });
});
