import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReportCreateForm from "../src/domains/report/components/ReportCreateForm";

describe("report create form", () => {
  it("submits builder payload with real source selections", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onLoadColumns = vi.fn().mockResolvedValue(undefined);

    render(
      <ReportCreateForm
        instances={[
          {
            id: 1,
            name: "生产集群",
            desc: "主实例"
          }
        ]}
        databases={[{ name: "default" }]}
        tables={[{ name: "logs" }]}
        columns={[
          { field: "event_time", type: "DateTime" },
          { field: "level", type: "String" }
        ]}
        isSubmitting={false}
        onInstanceChange={vi.fn().mockResolvedValue(undefined)}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={onLoadColumns}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText("报表名称"), {
      target: { value: "错误日志小时报" }
    });
    fireEvent.change(screen.getByLabelText("时间字段"), {
      target: { value: "event_time" }
    });
    fireEvent.change(screen.getByLabelText("时间范围"), {
      target: { value: "1h" }
    });
    fireEvent.change(screen.getByLabelText("WHERE 条件"), {
      target: { value: "level = 'error'" }
    });
    fireEvent.click(screen.getByRole("button", { name: "确认创建" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "错误日志小时报",
        builder: {
          instanceId: 1,
          database: "default",
          table: "logs",
          timeField: "event_time",
          timeRange: "1h",
          where: "level = 'error'",
          metrics: [{ key: "count", label: "总量" }]
        }
      })
    );
    expect(onLoadColumns).toHaveBeenCalledWith(1, "default", "logs");
  });

  it("shows a clear message when the selected database has no tables", () => {
    render(
      <ReportCreateForm
        instances={[
          {
            id: 1,
            name: "生产集群",
            desc: "主实例"
          }
        ]}
        databases={[{ name: "default" }]}
        tables={[]}
        columns={[]}
        isSubmitting={false}
        onInstanceChange={vi.fn().mockResolvedValue(undefined)}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={vi.fn().mockResolvedValue(undefined)}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "当前数据库下没有可用数据表，请切换到有业务数据的库。"
    );
    expect(screen.getByRole("button", { name: "确认创建" })).toBeDisabled();
  });

  it("shows loading status instead of empty-table warning while tables are loading", () => {
    render(
      <ReportCreateForm
        instances={[
          {
            id: 1,
            name: "生产集群",
            desc: "主实例"
          }
        ]}
        databases={[{ name: "default" }]}
        tables={[]}
        columns={[]}
        isLoadingTables
        isSubmitting={false}
        onInstanceChange={vi.fn().mockResolvedValue(undefined)}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={vi.fn().mockResolvedValue(undefined)}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "正在加载当前数据库的数据表..."
    );
    expect(
      screen.queryByText("当前数据库下没有可用数据表，请切换到有业务数据的库。")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认创建" })).toBeDisabled();
  });

  it("does not crash when source props are null-like at runtime", () => {
    render(
      <ReportCreateForm
        instances={null as never}
        databases={null as never}
        tables={null as never}
        columns={null as never}
        isSubmitting={false}
        onInstanceChange={vi.fn().mockResolvedValue(undefined)}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={vi.fn().mockResolvedValue(undefined)}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "当前没有可用的数据源实例，请先在 v1 或配置中心完成 ClickHouse 数据源配置。"
    );
  });

  it("does not refetch databases or columns just because callback props changed", async () => {
    const firstOnInstanceChange = vi.fn().mockResolvedValue(undefined);
    const secondOnInstanceChange = vi.fn().mockResolvedValue(undefined);
    const firstOnLoadColumns = vi.fn().mockResolvedValue(undefined);
    const secondOnLoadColumns = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ReportCreateForm
        mode="edit"
        initialValue={{
          reportId: 1001,
          name: "小时报",
          builder: {
            instanceId: 1,
            database: "dev_log",
            table: "app_stdout",
            timeField: "time",
            timeRange: "1h",
            where: "level = 'error'",
            metrics: [{ key: "count", label: "总量" }]
          }
        }}
        instances={[
          {
            id: 1,
            name: "生产集群",
            desc: "主实例"
          }
        ]}
        databases={[]}
        tables={[]}
        columns={[]}
        isSubmitting={false}
        onInstanceChange={firstOnInstanceChange}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={firstOnLoadColumns}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await waitFor(() => {
      expect(firstOnInstanceChange).toHaveBeenCalledTimes(1);
      expect(firstOnLoadColumns).toHaveBeenCalledTimes(1);
    });

    rerender(
      <ReportCreateForm
        mode="edit"
        initialValue={{
          reportId: 1001,
          name: "小时报",
          builder: {
            instanceId: 1,
            database: "dev_log",
            table: "app_stdout",
            timeField: "time",
            timeRange: "1h",
            where: "level = 'error'",
            metrics: [{ key: "count", label: "总量" }]
          }
        }}
        instances={[
          {
            id: 1,
            name: "生产集群",
            desc: "主实例"
          }
        ]}
        databases={[]}
        tables={[]}
        columns={[]}
        isSubmitting={false}
        onInstanceChange={secondOnInstanceChange}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={secondOnLoadColumns}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(secondOnInstanceChange).not.toHaveBeenCalled();
    expect(secondOnLoadColumns).not.toHaveBeenCalled();
  });

  it("does not reset and refetch when initialValue object identity changes but values stay the same", async () => {
    const onInstanceChange = vi.fn().mockResolvedValue(undefined);
    const onLoadColumns = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <ReportCreateForm
        mode="edit"
        initialValue={{
          reportId: 1001,
          name: "小时报",
          builder: {
            instanceId: 1,
            database: "dev_log",
            table: "app_stdout",
            timeField: "time",
            timeRange: "1h",
            where: "level = 'error'",
            metrics: [{ key: "count", label: "总量" }]
          }
        }}
        instances={[
          {
            id: 1,
            name: "生产集群",
            desc: "主实例"
          }
        ]}
        databases={[]}
        tables={[]}
        columns={[]}
        isSubmitting={false}
        onInstanceChange={onInstanceChange}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={onLoadColumns}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await waitFor(() => {
      expect(onInstanceChange).toHaveBeenCalledTimes(1);
      expect(onLoadColumns).toHaveBeenCalledTimes(1);
    });

    rerender(
      <ReportCreateForm
        mode="edit"
        initialValue={{
          reportId: 1001,
          name: "小时报",
          builder: {
            instanceId: 1,
            database: "dev_log",
            table: "app_stdout",
            timeField: "time",
            timeRange: "1h",
            where: "level = 'error'",
            metrics: [{ key: "count", label: "总量" }]
          }
        }}
        instances={[
          {
            id: 1,
            name: "生产集群",
            desc: "主实例"
          }
        ]}
        databases={[]}
        tables={[]}
        columns={[]}
        isSubmitting={false}
        onInstanceChange={onInstanceChange}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={onLoadColumns}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onInstanceChange).toHaveBeenCalledTimes(1);
    expect(onLoadColumns).toHaveBeenCalledTimes(1);
  });
});
