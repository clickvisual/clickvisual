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
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "错误日志小时报",
          builder: expect.objectContaining({
            instanceId: 1,
            database: "default",
            table: "logs",
            timeField: "event_time",
            timeRange: "1h",
            where: "level = 'error'",
            metrics: [{ key: "count", label: "总量", groupBy: "", limit: 3 }],
            blocks: [
              {
                key: "default",
                label: "默认条件块",
                where: "level = 'error'",
                metrics: [{ key: "count", label: "总量", groupBy: "", limit: 3 }]
              }
            ]
          })
        })
      )
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

  it("submits blocks payload and supports adding or copying blocks", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ReportCreateForm
        mode="edit"
        initialValue={{
          reportId: 1001,
          name: "小时报",
          builder: {
            instanceId: 1,
            database: "default",
            table: "logs",
            timeField: "event_time",
            timeRange: "1h",
            where: "level = 'error'",
            metrics: [{ key: "count", label: "总量" }],
            blocks: [
              {
                key: "error",
                label: "Error 日志",
                where: "level = 'error'",
                metrics: [{ key: "count", label: "总量" }]
              }
            ]
          }
        }}
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
        onLoadColumns={vi.fn().mockResolvedValue(undefined)}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "复制当前条件块" }));
    fireEvent.click(screen.getByRole("button", { name: "新增条件块" }));

    expect(screen.getAllByLabelText("条件块名称")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "确认保存" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          builder: expect.objectContaining({
            blocks: expect.arrayContaining([
              expect.objectContaining({
                label: expect.any(String),
                metrics: expect.any(Array)
              })
            ])
          })
        })
      )
    );
  });

  it("disables block creation after reaching the max block count", () => {
    render(
      <ReportCreateForm
        mode="edit"
        initialValue={{
          reportId: 1001,
          name: "小时报",
          builder: {
            instanceId: 1,
            database: "default",
            table: "logs",
            timeField: "event_time",
            timeRange: "1h",
            where: "",
            metrics: [{ key: "count", label: "总量" }],
            blocks: Array.from({ length: 5 }, (_, index) => ({
              key: `block-${index + 1}`,
              label: `条件块 ${index + 1}`,
              where: "",
              metrics: [{ key: "count", label: "总量" }]
            }))
          }
        }}
        instances={[
          {
            id: 1,
            name: "生产集群",
            desc: "主实例"
          }
        ]}
        databases={[{ name: "default" }]}
        tables={[{ name: "logs" }]}
        columns={[{ field: "event_time", type: "DateTime" }]}
        isSubmitting={false}
        onInstanceChange={vi.fn().mockResolvedValue(undefined)}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={vi.fn().mockResolvedValue(undefined)}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByRole("button", { name: "新增条件块" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "复制当前条件块" })).toBeDisabled();
  });

  it("shows metric guide and submits custom metrics", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

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
        columns={[{ field: "event_time", type: "DateTime" }]}
        isSubmitting={false}
        onInstanceChange={vi.fn().mockResolvedValue(undefined)}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={vi.fn().mockResolvedValue(undefined)}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "填写说明" }));
    expect(screen.getByRole("note")).toHaveTextContent(
      "表达式只填 ClickHouse 聚合表达式，不要写 SELECT、FROM、WHERE。"
    );

    fireEvent.click(screen.getByRole("button", { name: "新增指标" }));
    fireEvent.change(screen.getByLabelText("指标名称 1-2"), {
      target: { value: "平均耗时" }
    });
    fireEvent.change(screen.getByLabelText("表达式 1-2"), {
      target: { value: "avg(duration)" }
    });
    fireEvent.click(screen.getByRole("button", { name: "确认创建" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          builder: expect.objectContaining({
            metrics: [
              { key: "count", label: "总量", groupBy: "", limit: 3 },
              {
                key: "custom",
                label: "平均耗时",
                expression: "avg(duration)",
                groupBy: "",
                limit: 3
              }
            ],
            blocks: [
              expect.objectContaining({
                metrics: [
                  { key: "count", label: "总量", groupBy: "", limit: 3 },
                  {
                    key: "custom",
                    label: "平均耗时",
                    expression: "avg(duration)",
                    groupBy: "",
                    limit: 3
                  }
                ]
              })
            ]
          })
        })
      )
    );
  });

  it("submits topn metrics", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

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
          { field: "pod", type: "String" }
        ]}
        isSubmitting={false}
        onInstanceChange={vi.fn().mockResolvedValue(undefined)}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={vi.fn().mockResolvedValue(undefined)}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "新增指标" }));
    fireEvent.change(screen.getByLabelText("指标名称 1-2"), {
      target: { value: "Top3 Pod" }
    });
    fireEvent.change(screen.getByLabelText("指标类型 1-2"), {
      target: { value: "topn" }
    });
    fireEvent.change(screen.getByLabelText("分组字段 1-2"), {
      target: { value: "pod" }
    });
    fireEvent.change(screen.getByLabelText("TopN 1-2"), {
      target: { value: "3" }
    });
    fireEvent.click(screen.getByRole("button", { name: "确认创建" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          builder: expect.objectContaining({
            blocks: [
              expect.objectContaining({
                metrics: [
                  { key: "count", label: "总量", groupBy: "", limit: 3 },
                  {
                    key: "topn",
                    label: "Top3 Pod",
                    groupBy: "pod",
                    limit: 3
                  }
                ]
              })
            ]
          })
        })
      )
    );
  });

  it("filters topn group-by options by groupable column types", async () => {
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
          { field: "pod", type: "String" },
          { field: "level", type: "LowCardinality(String)" },
          { field: "duration", type: "Float64" }
        ]}
        isSubmitting={false}
        onInstanceChange={vi.fn().mockResolvedValue(undefined)}
        onDatabaseChange={vi.fn().mockResolvedValue(undefined)}
        onLoadColumns={vi.fn().mockResolvedValue(undefined)}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "新增指标" }));
    fireEvent.change(screen.getByLabelText("指标类型 1-2"), {
      target: { value: "topn" }
    });

    const groupBySelect = screen.getByLabelText("分组字段 1-2");
    expect(groupBySelect).toHaveTextContent("pod");
    expect(groupBySelect).toHaveTextContent("level");
    expect(groupBySelect).not.toHaveTextContent("event_time");
    expect(groupBySelect).not.toHaveTextContent("duration");
  });
});
