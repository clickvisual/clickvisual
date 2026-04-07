import type {
  ModuleDataScenario,
  ModuleId,
  ModuleWorkspaceMeta,
} from "../types/moduleWorkspace";

const WORKSPACE_META: Record<ModuleId, ModuleWorkspaceMeta> = {
  overview: {
    moduleId: "overview",
    moduleLabel: "总览大盘",
    stateCopy: {
      loadingTitle: "正在汇总总览数据",
      loadingDescription: "聚合日志量、错误率和 AI 摘要中，请稍候。",
      emptyTitle: "当前时间范围内暂无总览数据",
      emptyDescription: "可以切换时间范围或刷新一次聚合任务后再查看。",
      errorTitle: "总览聚合加载失败",
      errorDescription: "聚合接口暂时不可用，但你仍可以切换到查询、告警和报表继续操作。"
    },
    aiCard: {
      title: "AI 总览动作",
      description: "围绕当前异常趋势生成结构化建议，并支持转化为告警或报表动作。",
      degradedHint: "AI 服务暂时降级，本次只返回失败提示，不影响总览浏览与切换页面。",
      disabledHint: "AI 服务已禁用，请先完成 AI 配置或稍后再试。",
      actions: [
        {
          id: "overview-summarize",
          label: "生成异常总结",
          description: "汇总过去 1 小时的异常趋势并输出结构化摘要。",
          successMessage: "AI 已生成异常总结，可继续转成值班播报。",
          failureMessage: "AI 总结生成失败，请稍后重试。"
        },
        {
          id: "overview-create-alert",
          label: "转成告警规则",
          description: "基于当前异常模式生成建议阈值和规则草稿。",
          successMessage: "已生成告警规则草稿，后续可带入告警中心。",
          failureMessage: "告警规则草稿生成失败。"
        },
        {
          id: "overview-create-report",
          label: "转成报表模板",
          description: "将异常摘要整理成日报或巡检报表模板。",
          successMessage: "已生成报表模板建议。",
          failureMessage: "报表模板生成失败。"
        }
      ]
    }
  },
  query: {
    moduleId: "query",
    moduleLabel: "日志查询",
    stateCopy: {
      loadingTitle: "正在执行查询",
      loadingDescription: "正在扫描当前时间范围内的日志数据，请稍候。",
      emptyTitle: "当前查询没有命中日志",
      emptyDescription: "可以放宽筛选条件、切换时间范围，或使用 AI 给出的改写建议。",
      errorTitle: "查询服务暂不可用",
      errorDescription: "查询结果暂时无法返回，但查询输入区和筛选条件仍可继续编辑。"
    },
    aiCard: {
      title: "AI 查询动作",
      description: "为当前 DSL / SQL 提供结构化优化、规则生成和图表建议。",
      degradedHint: "AI 优化暂时失败，查询输入与执行按钮仍可正常使用。",
      disabledHint: "AI 优化当前不可用，请先完成 AI 配置。",
      actions: [
        {
          id: "query-optimize",
          label: "优化当前查询",
          description: "输出更适合 ClickHouse 的过滤、PREWHERE 和聚合建议。",
          successMessage: "已生成查询优化建议。",
          failureMessage: "查询优化失败，请检查 AI 服务状态。"
        },
        {
          id: "query-alert",
          label: "生成告警条件",
          description: "基于当前查询自动生成可试跑的告警条件。",
          successMessage: "已生成告警条件草稿。",
          failureMessage: "告警条件生成失败。"
        },
        {
          id: "query-chart",
          label: "生成图表配置",
          description: "根据聚合结果建议合适的图表和 drill down 维度。",
          successMessage: "已生成图表配置建议。",
          failureMessage: "图表配置生成失败。"
        }
      ]
    }
  },
  alert: {
    moduleId: "alert",
    moduleLabel: "告警中心",
    stateCopy: {
      loadingTitle: "正在加载告警规则",
      loadingDescription: "规则列表、最近事件与试跑上下文准备中。",
      emptyTitle: "当前还没有可展示的规则",
      emptyDescription: "可以直接新建规则，或先用 AI 基于异常模式生成一版草稿。",
      errorTitle: "告警规则加载失败",
      errorDescription: "规则列表暂时不可用，但钉钉模板、AI 建议与创建入口仍可继续使用。"
    },
    aiCard: {
      title: "AI 告警动作",
      description: "围绕当前规则和异常事件生成结构化优化动作。",
      degradedHint: "AI 规则建议失败，但告警规则创建、编辑和试跑不受影响。",
      disabledHint: "AI 规则建议已禁用，请先检查 AI 配置。",
      actions: [
        {
          id: "alert-split",
          label: "拆分阈值规则",
          description: "按环境、服务或机房拆分统一阈值，减少噪声。",
          successMessage: "已生成按维度拆分的规则建议。",
          failureMessage: "规则拆分建议生成失败。"
        },
        {
          id: "alert-root-cause",
          label: "生成根因摘要",
          description: "根据最近事件和日志样本汇总根因方向。",
          successMessage: "已生成根因摘要。",
          failureMessage: "根因摘要生成失败。"
        },
        {
          id: "alert-template",
          label: "优化钉钉模板",
          description: "根据当前告警等级和事件上下文优化推送模板。",
          successMessage: "已生成钉钉模板建议。",
          failureMessage: "钉钉模板建议生成失败。"
        }
      ]
    }
  },
  settings: {
    moduleId: "settings",
    moduleLabel: "配置中心",
    stateCopy: {
      loadingTitle: "正在加载配置摘要",
      loadingDescription: "数据源、通知和字段映射状态同步中。",
      emptyTitle: "当前租户还未完成基础配置",
      emptyDescription: "建议先补数据源与字段映射，再启用 DingTalk 和 AI 相关能力。",
      errorTitle: "配置摘要加载失败",
      errorDescription: "配置读取失败，但本地表单与保存动作仍可继续演练。"
    },
    aiCard: {
      title: "AI 配置动作",
      description: "基于当前 schema、通知和模型配置生成结构化配置建议。",
      degradedHint: "AI 配置建议暂时失败，不影响手动保存配置和连接测试。",
      disabledHint: "AI 配置建议已禁用，请先完成模型接入。",
      actions: [
        {
          id: "settings-schema",
          label: "生成字段映射建议",
          description: "根据日志样本补齐 time、service、trace_id 等映射。",
          successMessage: "已生成字段映射建议。",
          failureMessage: "字段映射建议生成失败。"
        },
        {
          id: "settings-report",
          label: "生成报表模板",
          description: "根据配置中心上下文生成推荐报表模板。",
          successMessage: "已生成报表模板建议。",
          failureMessage: "报表模板建议生成失败。"
        },
        {
          id: "settings-alert",
          label: "生成告警模板",
          description: "根据当前 SLA 与 schema 生成基础告警模板。",
          successMessage: "已生成告警模板建议。",
          failureMessage: "告警模板建议生成失败。"
        }
      ]
    }
  }
};

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function getModuleWorkspaceMeta(moduleId: ModuleId) {
  return WORKSPACE_META[moduleId];
}

export async function fetchModuleWorkspaceSnapshot(
  moduleId: ModuleId,
  scenario: ModuleDataScenario
) {
  if (scenario === "loading") {
    return new Promise<never>(() => undefined);
  }

  await delay(420);

  if (scenario === "error") {
    throw new Error(WORKSPACE_META[moduleId].stateCopy.errorDescription);
  }

  if (scenario === "empty") {
    return { hasContent: false as const };
  }

  return { hasContent: true as const };
}
