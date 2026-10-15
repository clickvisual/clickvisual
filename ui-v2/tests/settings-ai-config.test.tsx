import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SettingsModelsPage from "../src/domains/settings/pages/SettingsModelsPage";

describe("settings model config", () => {
  it("configures a Responses model and preserves its protocol and reasoning effort", async () => {
    render(<MemoryRouter><SettingsModelsPage /></MemoryRouter>);
    await screen.findByText("grok-4");
    fireEvent.click(screen.getByRole("button", { name: "添加模型" }));
    fireEvent.change(screen.getByLabelText("模型名称"), { target: { value: "Grok Responses" } });
    fireEvent.change(screen.getByLabelText("模型 ID"), { target: { value: "grok-responses" } });
    fireEvent.change(screen.getByLabelText("模型协议"), { target: { value: "openai-responses" } });
    fireEvent.change(screen.getByLabelText("模型 Base URL"), { target: { value: "https://gateway.example/v1" } });
    fireEvent.change(screen.getByLabelText("模型名"), { target: { value: "grok-responses-test" } });
    fireEvent.change(screen.getByLabelText("推理强度"), { target: { value: "low" } });
    fireEvent.change(screen.getByLabelText("模型 API Key"), { target: { value: "test-responses-key" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByText("已添加，并设为最高优先级");
    expect(screen.getByText("OpenAI Responses")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "编辑 Grok Responses" }));
    expect(screen.getByLabelText("模型协议")).toHaveValue("openai-responses");
    expect(screen.getByLabelText("推理强度")).toHaveValue("low");
    expect(screen.getByLabelText("模型 API Key")).toHaveValue("");
  });

  it("lists providers, adds one at the front, and tests the connection", async () => {
    render(
      <MemoryRouter>
        <SettingsModelsPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "AI 模型" })).toBeInTheDocument();
    expect(screen.getByText("grok-4")).toBeInTheDocument();
    expect(screen.getByText("claude-haiku")).toBeInTheDocument();
    expect(screen.getAllByText("Grok").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "添加模型" }));
    fireEvent.change(screen.getByLabelText("模型名称"), { target: { value: "备用" } });
    fireEvent.change(screen.getByLabelText("模型 ID"), { target: { value: "backup" } });
    fireEvent.change(screen.getByLabelText("模型 Base URL"), { target: { value: "https://gateway.example.com/v1" } });
    fireEvent.change(screen.getByLabelText("模型名"), { target: { value: "gpt-backup" } });
    fireEvent.change(screen.getByLabelText("模型 API Key"), { target: { value: "sk-backup-9999" } });
    fireEvent.click(screen.getByRole("button", { name: "测试连接" }));
    expect(await screen.findByText(/连接正常，0.3s/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByText("已添加，并设为最高优先级")).toBeInTheDocument();
    await waitFor(() => {
      const names = screen.getAllByRole("listitem").map((item) => item.textContent || "");
      const backup = names.findIndex((text) => text.includes("gpt-backup"));
      const grok = names.findIndex((text) => text.includes("grok-4"));
      expect(backup).toBe(0);
      expect(grok).toBeGreaterThan(backup);
    });

    fireEvent.click(screen.getByRole("button", { name: "下移 备用" }));
    expect(await screen.findByText("调用顺序已更新")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "测试 Grok" }));
    expect(await screen.findByText(/Grok：连接正常/)).toBeInTheDocument();
  });
});
