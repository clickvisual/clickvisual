import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../state/PageState";
import type { ReactNode } from "react";
import type { AiActionMode } from "./AiActionPanel";

export type DemoViewState = "ready" | "loading" | "empty" | "error";

export function useModuleRuntimeState() {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const viewParam = searchParams.get("cv_state");
    const aiParam = searchParams.get("cv_ai");

    const viewState: DemoViewState =
      viewParam === "loading" ||
      viewParam === "empty" ||
      viewParam === "error"
        ? viewParam
        : "ready";
    const aiMode: AiActionMode =
      aiParam === "error" || aiParam === "disabled" ? aiParam : "ready";

    return { viewState, aiMode };
  }, [searchParams]);
}

interface ModuleRuntimeGateProps {
  viewState: DemoViewState;
  loadingTitle: string;
  emptyTitle: string;
  errorTitle: string;
  children: ReactNode;
}

export default function ModuleRuntimeGate({
  viewState,
  loadingTitle,
  emptyTitle,
  errorTitle,
  children
}: ModuleRuntimeGateProps) {
  if (viewState === "loading") {
    return (
      <LoadingState
        title={loadingTitle}
        description="当前处于 mock-first 加载态，用于验证页面骨架和加载反馈。"
      />
    );
  }

  if (viewState === "empty") {
    return (
      <EmptyState
        title={emptyTitle}
        description="当前无可展示数据，页面仍保留结构与后续接入真实契约的位置。"
      />
    );
  }

  return (
    <>
      {viewState === "error" ? (
        <ErrorState
          title={errorTitle}
          description="聚合数据暂不可用，已回退到前端壳层数据，核心操作与 AI 动作入口仍可继续验证。"
        />
      ) : null}
      {children}
    </>
  );
}
