import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReportScheduleForm from "../src/domains/report/components/ReportScheduleForm";
import type {
  ReportPushChannel,
  ReportScheduleConfig
} from "../src/domains/report/types/contracts";

describe("report schedule form", () => {
  it("submits report schedule with dingtalk channels", () => {
    const handleSubmit = vi.fn();
    const initialValue: ReportScheduleConfig = {
      reportId: 1001,
      desc: "核心指标日报任务",
      dutyUid: 10086,
      cron: "0 0 9 * * *",
      typ: 0,
      args: [{ key: "template", val: "daily-core-kpi" }],
      isRetry: 1,
      retryTimes: 2,
      retryInterval: 300,
      channelIds: [201]
    };
    const channels: ReportPushChannel[] = [
      {
        id: 201,
        key: "ops-dingtalk",
        name: "运维钉钉群",
        typ: "dingtalk",
        enabled: true,
        token: "mock-token",
        webhook: "https://oapi.dingtalk.com/robot/send?access_token=mock"
      }
    ];

    render(
      <ReportScheduleForm
        initialValue={initialValue}
        channels={channels}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText("Cron"), {
      target: { value: "0 */1 * * * *" }
    });
    fireEvent.click(screen.getByLabelText("运维钉钉群"));
    fireEvent.click(screen.getByRole("button", { name: "保存报表调度" }));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reportId: 1001,
        cron: "0 */1 * * * *",
        channelIds: []
      })
    );
  });

  it("disables form controls while submitting", () => {
    const initialValue: ReportScheduleConfig = {
      reportId: 1001,
      desc: "核心指标日报任务",
      dutyUid: 10086,
      cron: "0 0 9 * * *",
      typ: 0,
      args: [{ key: "template", val: "daily-core-kpi" }],
      isRetry: 1,
      retryTimes: 2,
      retryInterval: 300,
      channelIds: [201]
    };
    const channels: ReportPushChannel[] = [
      {
        id: 201,
        key: "ops-dingtalk",
        name: "运维钉钉群",
        typ: "dingtalk",
        enabled: true,
        token: "mock-token",
        webhook: "https://oapi.dingtalk.com/robot/send?access_token=mock"
      }
    ];

    render(
      <ReportScheduleForm
        initialValue={initialValue}
        channels={channels}
        isSubmitting
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Cron")).toBeDisabled();
    expect(screen.getByLabelText("运维钉钉群")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "保存中..." })
    ).toBeDisabled();
  });
});
