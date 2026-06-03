import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IngestionWorkbenchPage from "../src/domains/query/pages/IngestionWorkbenchPage";

describe("ingestion workbench", () => {
  beforeEach(() => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        const payload = init?.body ? JSON.parse(String(init.body)) : null;

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/detect")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  timeCandidates: [
                    {
                      path: "time",
                      label: "event time",
                      confidence: 0.99,
                      reason: "unix timestamp"
                    }
                  ],
                  bodyCandidates: [
                    {
                      path: "contents.content",
                      label: "body",
                      confidence: 0.96,
                      reason: "json string body"
                    }
                  ],
                  tagCandidates: [
                    {
                      path: "tags",
                      label: "tags",
                      confidence: 0.95,
                      reason: "stable tag object"
                    }
                  ],
                  nestedJsonCandidates: [
                    {
                      path: "contents.content",
                      label: "nested json",
                      confidence: 0.94,
                      reason: "stringified json"
                    }
                  ],
                  risks: [],
                  samplePreview: []
                }
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/fields")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: [
                  {
                    fieldKey: "app",
                    displayName: "app",
                    path: "contents.content.app",
                    source: "json_path",
                    valueType: "string",
                    isScalar: true,
                    coverage: 1,
                    stability: 0.95,
                    recommendedOperators: ["=", "!=", "contains"],
                    isAccelerated: false,
                    accelerationStatus: "json_path"
                  },
                  {
                    fieldKey: "lv",
                    displayName: "lv",
                    path: "contents.content.lv",
                    source: "json_path",
                    valueType: "string",
                    isScalar: true,
                    coverage: 1,
                    stability: 0.94,
                    recommendedOperators: ["=", "!=", "contains"],
                    isAccelerated: false,
                    accelerationStatus: "json_path"
                  },
                  {
                    fieldKey: "msg",
                    displayName: "msg",
                    path: "contents.content.msg",
                    source: "json_path",
                    valueType: "string",
                    isScalar: true,
                    coverage: 1,
                    stability: 0.93,
                    recommendedOperators: ["=", "contains"],
                    isAccelerated: false,
                    accelerationStatus: "json_path"
                  }
                ]
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/publish-draft")) {
          const defaultFields = Array.isArray(payload?.defaultFields) ? payload.defaultFields : [];
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  sourceType: payload?.sourceType ?? "kafka_json",
                  normalization: payload?.normalization ?? {},
                  queryableFields: payload?.queryableFields ?? [],
                  defaultFields,
                  warnings:
                    defaultFields.length > 0
                      ? [
                          {
                            code: "publish.default_fields_json_only",
                            level: "info",
                            message: "当前默认字段全部走 JSON 路径查询，建议上线后观察慢查询再决定是否物化。"
                          }
                        ]
                      : [],
                  requiresConfirm: true
                }
            })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/ai/run")) {
          if (payload?.scenario === "query.ingestion.detect_explain") {
            return {
              ok: true,
              text: async () =>
                JSON.stringify({
                  code: 0,
                  msg: "succ",
                  data: {
                    summary: "建议优先使用 time 作为事件时间，contents.content 作为正文路径。",
                    decisions: [
                      {
                        key: "time",
                        title: "时间字段",
                        description: "优先使用 time，避免查询时间语义漂移。"
                      },
                      {
                        key: "body",
                        title: "正文字段",
                        description: "优先使用 contents.content 作为 JSON 主体路径。"
                      }
                    ],
                    risks: [],
                    suggestions: [
                      {
                        type: "normalization",
                        title: "解析草案",
                        description: "建议开启二次 JSON 解析。"
                      }
                    ],
                    requiresUserConfirmation: true
                  }
                })
            };
          }

          if (payload?.scenario === "query.ingestion.field_recommend") {
            return {
              ok: true,
              text: async () =>
                JSON.stringify({
                  code: 0,
                  msg: "succ",
                  data: {
                    summary: "建议优先开放 app、lv、msg 这 3 个默认字段。",
                    decisions: [
                      {
                        key: "app",
                        title: "app",
                        description: "覆盖率高，适合作为默认过滤字段。"
                      },
                      {
                        key: "lv",
                        title: "lv",
                        description: "稳定度高，便于快速筛选日志级别。"
                      },
                      {
                        key: "msg",
                        title: "msg",
                        description: "可作为默认检索字段。"
                      }
                    ],
                    risks: [],
                    suggestions: [
                      {
                        type: "default_fields",
                        title: "默认字段",
                        description: "app, lv, msg"
                      }
                    ],
                    requiresUserConfirmation: true
                  }
                })
            };
          }

          if (payload?.scenario === "query.ingestion.publish_summary") {
            return {
              ok: true,
              text: async () =>
                JSON.stringify({
                  code: 0,
                  msg: "succ",
                  data: {
                    summary: "本次接入将以 time 作为事件时间，默认开放 3 个查询字段。",
                    decisions: [
                      {
                        key: "publish.strategy",
                        title: "发布策略",
                        description: "先走 JSON 路径查询，后续按慢查询再决定是否物化。"
                      }
                    ],
                    risks: payload?.input?.warnings ?? [],
                    suggestions: [
                      {
                        type: "publish_summary",
                        title: "发布摘要",
                        description: "字段目录已生成，保持人工确认后发布。"
                      }
                    ],
                    requiresUserConfirmation: true
                  }
                })
            };
          }
        }

        if (method === "GET" && url.pathname.endsWith("/api/v2/base/settings/instances")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: [
                  {
                    id: 3,
                    name: "test-instance",
                    clusters: ["cluster-a"],
                    mode: 0
                  }
                ]
              })
          };
        }

        if (method === "GET" && url.pathname.endsWith("/api/v1/instances/3/databases-exist")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: ["default"]
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/publish")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  instanceId: payload?.target?.instanceId ?? 3,
                  databaseId: 11,
                  databaseName: payload?.target?.databaseName ?? "default",
                  tableId: 22,
                  tableName: payload?.target?.tableName ?? "app_log",
                  fieldCount: Array.isArray(payload?.queryableFields) ? payload.queryableFields.length : 0,
                  defaultFields: payload?.defaultFields ?? []
                }
              })
          };
        }

        return {
          ok: false,
          text: async () =>
            JSON.stringify({
              code: 1,
              msg: `unhandled request: ${method} ${url.pathname}`,
              data: null
            })
        };
      })
    );
  });

  it("walks through detection, normalization, fields, and publish creation", async () => {
    render(<IngestionWorkbenchPage />);

    fireEvent.click(screen.getByRole("button", { name: "Kafka JSON 新接入" }));
    expect(await screen.findByLabelText("样本 JSON")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "识别样本结构" }));
    expect(await screen.findByLabelText("事件时间路径")).toHaveValue("time");

    fireEvent.click(screen.getByRole("button", { name: "生成 AI 草案" }));
    expect(await screen.findByRole("button", { name: "应用解析草案" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "应用解析草案" }));

    fireEvent.click(screen.getByRole("button", { name: "确认解析并生成字段目录" }));
    expect(await screen.findByText("contents.content.app")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "生成 AI 草案" }));
    fireEvent.click(await screen.findByRole("button", { name: "应用默认字段" }));
    fireEvent.click(screen.getByRole("button", { name: "进入发布预览" }));

    expect(await screen.findByRole("heading", { name: "AI 发布摘要" })).toBeInTheDocument();
    expect(screen.getByLabelText("时间类型")).toHaveValue("1");
    fireEvent.click(screen.getByRole("button", { name: "生成 AI 草案" }));
    expect(await screen.findByText(/本次接入将以 time 作为事件时间/)).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText("发布实例"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("数据库"), { target: { value: "default" } });
    fireEvent.change(screen.getByLabelText("日志库"), { target: { value: "app_log" } });
    fireEvent.change(screen.getByLabelText("Cluster"), { target: { value: "cluster-a" } });
    fireEvent.change(screen.getByLabelText("接入描述"), { target: { value: "首版接入" } });
    fireEvent.click(screen.getByRole("button", { name: "确认并创建" }));

    await waitFor(() => {
      expect(screen.getByText(/已创建 default.app_log/)).toBeInTheDocument();
    });
  });

  it("auto infers publish time field type from the selected time field sample", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        const payload = init?.body ? JSON.parse(String(init.body)) : null;

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/detect")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  timeCandidates: [{ path: "contents._time_", label: "event time", confidence: 0.99, reason: "rfc3339 nano" }],
                  bodyCandidates: [{ path: "contents.content", label: "body", confidence: 0.96, reason: "json string body" }],
                  tagCandidates: [{ path: "tags", label: "tags", confidence: 0.95, reason: "stable tag object" }],
                  nestedJsonCandidates: [{ path: "contents.content", label: "nested json", confidence: 0.94, reason: "stringified json" }],
                  risks: [],
                  samplePreview: []
                }
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/fields")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: [
                  {
                    fieldKey: "app",
                    displayName: "app",
                    path: "contents.content.app",
                    source: "json_path",
                    valueType: "string",
                    isScalar: true,
                    coverage: 1,
                    stability: 0.95,
                    recommendedOperators: ["=", "!=", "contains"],
                    isAccelerated: false,
                    accelerationStatus: "json_path"
                  }
                ]
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/publish-draft")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  sourceType: payload?.sourceType ?? "kafka_json",
                  normalization: payload?.normalization ?? {},
                  queryableFields: payload?.queryableFields ?? [],
                  defaultFields: payload?.defaultFields ?? [],
                  warnings: [],
                  requiresConfirm: true
                }
              })
          };
        }

        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: []
            })
        };
      })
    );

    render(<IngestionWorkbenchPage />);

    fireEvent.click(screen.getByRole("button", { name: "Kafka JSON 新接入" }));
    fireEvent.click(await screen.findByRole("button", { name: "识别样本结构" }));
    expect(await screen.findByLabelText("事件时间路径")).toHaveValue("contents._time_");

    fireEvent.click(screen.getByRole("button", { name: "确认解析并生成字段目录" }));
    await screen.findByText("contents.content.app");
    fireEvent.click(screen.getByRole("button", { name: "进入发布预览" }));

    expect(await screen.findByLabelText("时间类型")).toHaveValue("5");
  });

  it("only exposes kafka ingestion in the current first release", async () => {
    render(<IngestionWorkbenchPage />);

    expect(screen.getByRole("button", { name: "Kafka JSON 新接入" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "已有 ClickHouse 表接入" })).not.toBeInTheDocument();
    expect(screen.getByText(/当前首版只开放 Kafka JSON 新接入/)).toBeInTheDocument();
  });

  it("applies recommended default fields from structured ai payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";
        const payload = init?.body ? JSON.parse(String(init.body)) : null;

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/detect")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  timeCandidates: [{ path: "time", label: "event time", confidence: 0.99, reason: "unix timestamp" }],
                  bodyCandidates: [{ path: "contents.content", label: "body", confidence: 0.96, reason: "json string body" }],
                  tagCandidates: [{ path: "tags", label: "tags", confidence: 0.95, reason: "stable tag object" }],
                  nestedJsonCandidates: [{ path: "contents.content", label: "nested json", confidence: 0.94, reason: "stringified json" }],
                  risks: [],
                  samplePreview: []
                }
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/fields")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: [
                  {
                    fieldKey: "app",
                    displayName: "app",
                    path: "contents.content.app",
                    source: "json_path",
                    valueType: "string",
                    isScalar: true,
                    coverage: 1,
                    stability: 0.95,
                    recommendedOperators: ["=", "!=", "contains"],
                    isAccelerated: false,
                    accelerationStatus: "json_path"
                  },
                  {
                    fieldKey: "lv",
                    displayName: "lv",
                    path: "contents.content.lv",
                    source: "json_path",
                    valueType: "string",
                    isScalar: true,
                    coverage: 1,
                    stability: 0.94,
                    recommendedOperators: ["=", "!=", "contains"],
                    isAccelerated: false,
                    accelerationStatus: "json_path"
                  },
                  {
                    fieldKey: "msg",
                    displayName: "msg",
                    path: "contents.content.msg",
                    source: "json_path",
                    valueType: "string",
                    isScalar: true,
                    coverage: 1,
                    stability: 0.93,
                    recommendedOperators: ["=", "contains"],
                    isAccelerated: false,
                    accelerationStatus: "json_path"
                  }
                ]
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/ai/run") && payload?.scenario === "query.ingestion.field_recommend") {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  summary: "建议优先开放 app、lv 两个默认字段。",
                  decisions: [
                    {
                      key: "broken",
                      title: "",
                      description: ""
                    }
                  ],
                  risks: [],
                  suggestions: [
                    {
                      type: "default_set",
                      title: "默认字段",
                      description: "app, lv",
                      payload: {
                        fieldKeys: ["app", "lv"]
                      }
                    }
                  ],
                  requiresUserConfirmation: true
                }
              })
          };
        }

        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: []
            })
        };
      })
    );

    render(<IngestionWorkbenchPage />);

    fireEvent.click(screen.getByRole("button", { name: "Kafka JSON 新接入" }));
    fireEvent.click(await screen.findByRole("button", { name: "识别样本结构" }));
    await screen.findByLabelText("事件时间路径");
    fireEvent.click(screen.getByRole("button", { name: "确认解析并生成字段目录" }));
    await screen.findByText("contents.content.app");

    const appCheckbox = screen.getAllByRole("checkbox")[0] as HTMLInputElement;
    const lvCheckbox = screen.getAllByRole("checkbox")[1] as HTMLInputElement;
    const msgCheckbox = screen.getAllByRole("checkbox")[2] as HTMLInputElement;

    expect(appCheckbox.checked).toBe(true);
    expect(lvCheckbox.checked).toBe(true);
    expect(msgCheckbox.checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "生成 AI 草案" }));
    await screen.findByRole("button", { name: "应用默认字段" });
    fireEvent.click(screen.getByRole("button", { name: "应用默认字段" }));

    await waitFor(() => {
      expect(appCheckbox.checked).toBe(true);
      expect(lvCheckbox.checked).toBe(true);
      expect(msgCheckbox.checked).toBe(false);
    });
  });

  it("keeps the core flow available when ai draft generation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl = typeof input === "string" ? input : input.toString();
        const url = new URL(rawUrl, "http://localhost");
        const method = init?.method || "GET";

        if (method === "POST" && url.pathname.endsWith("/api/v2/ai/run")) {
          return {
            ok: false,
            text: async () =>
              JSON.stringify({
                code: 1,
                msg: "ai provider timeout",
                data: null
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/detect")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: {
                  timeCandidates: [{ path: "time", label: "event time", confidence: 0.99, reason: "unix timestamp" }],
                  bodyCandidates: [{ path: "contents.content", label: "body", confidence: 0.96, reason: "json string body" }],
                  tagCandidates: [{ path: "tags", label: "tags", confidence: 0.95, reason: "stable tag object" }],
                  nestedJsonCandidates: [{ path: "contents.content", label: "nested json", confidence: 0.94, reason: "stringified json" }],
                  risks: [],
                  samplePreview: []
                }
              })
          };
        }

        if (method === "POST" && url.pathname.endsWith("/api/v2/query/ingestion/fields")) {
          return {
            ok: true,
            text: async () =>
              JSON.stringify({
                code: 0,
                msg: "succ",
                data: [
                  {
                    fieldKey: "app",
                    displayName: "app",
                    path: "contents.content.app",
                    source: "json_path",
                    valueType: "string",
                    isScalar: true,
                    coverage: 1,
                    stability: 0.95,
                    recommendedOperators: ["=", "!=", "contains"],
                    isAccelerated: false,
                    accelerationStatus: "json_path"
                  }
                ]
              })
          };
        }

        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              code: 0,
              msg: "succ",
              data: []
            })
        };
      })
    );

    render(<IngestionWorkbenchPage />);

    fireEvent.click(screen.getByRole("button", { name: "Kafka JSON 新接入" }));
    fireEvent.click(await screen.findByRole("button", { name: "识别样本结构" }));
    await screen.findByLabelText("事件时间路径");

    fireEvent.click(screen.getByRole("button", { name: "生成 AI 草案" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ai provider timeout");

    fireEvent.click(screen.getByRole("button", { name: "确认解析并生成字段目录" }));
    expect(await screen.findByText("contents.content.app")).toBeInTheDocument();
  });
});
