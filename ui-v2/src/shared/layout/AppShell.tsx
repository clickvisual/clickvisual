import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import {
  DEFAULT_TIME_RANGE_OPTIONS,
  TimeRangeSwitcher
} from "../components/TimeRangeSwitcher";
import {
  getTimeRangeLabel,
  TimeRangeProvider,
  useTimeRange,
} from "../state/TimeRangeContext";
import VersionSwitcher from "./VersionSwitcher";

const primaryNavigation = [
  { to: "/v2/overview", label: "总览大盘", icon: "◫" },
  { to: "/v2/query", label: "日志查询", icon: "⌘" },
  { to: "/v2/reports", label: "定时报表", icon: "◌" },
  { to: "/v2/alerts/rules", label: "告警中心", icon: "!" },
  { to: "/v2/settings/datasource", label: "配置中心", icon: "⋯" }
] as const;

function ShellFrame({ children }: { children: ReactNode }) {
  const { timeRange, setTimeRange } = useTimeRange();

  return (
    <div className="cv-shell">
      <aside className="cv-shell__sidebar" data-testid="app-shell-sidebar">
        <div className="cv-shell__brand">
          <div className="cv-shell__brand-mark" aria-hidden="true">
            CH
          </div>
          <div className="cv-shell__brand-copy">
            <span className="cv-shell__brand-title">ClickHouse</span>
            <span className="cv-shell__brand-subtitle">Log Engine</span>
          </div>
        </div>
        <nav aria-label="v2 主导航" className="cv-shell__nav">
          {primaryNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `cv-shell__nav-link${isActive ? " cv-shell__nav-link--active" : ""}`
              }
            >
              <span className="cv-shell__nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="cv-shell__sidebar-cta">
          <span aria-hidden="true">+</span>
          新建查询
        </button>
        <div className="cv-shell__sidebar-secondary" aria-label="辅助导航">
          <a href="#support">
            <span aria-hidden="true">?</span>
            支持中心
          </a>
          <a href="#docs">
            <span aria-hidden="true">/</span>
            使用文档
          </a>
        </div>
      </aside>
      <section className="cv-shell__main">
        <header className="cv-shell__topbar" data-testid="app-shell-topbar">
          <div className="cv-shell__topbar-inner">
            <label className="cv-shell__search" aria-label="全局搜索">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="搜索日志、Trace、报表或配置"
              />
            </label>
            <div className="cv-shell__topbar-actions">
              <TimeRangeSwitcher
                options={DEFAULT_TIME_RANGE_OPTIONS}
                value={timeRange}
                onChange={setTimeRange}
              />
              <VersionSwitcher />
            </div>
          </div>
        </header>
        <div className="cv-shell__workspace">
          <section className="cv-shell__hero">
            <div>
              <div className="cv-shell__eyebrow">The Kinetic Architect</div>
              <h1 className="cv-shell__headline">ClickVisual v2 控制台</h1>
              <p className="cv-shell__subhead">
                面向 ClickHouse 日志检索、告警和报表的一体化工作区。共享底座保持玻璃侧栏、无描边层次和橘色动作焦点，供五个模块直接复用。
              </p>
            </div>
            <div className="cv-shell__status">
              当前时间范围：{getTimeRangeLabel(timeRange)}
            </div>
          </section>
          <main data-testid="app-shell-main" className="cv-shell__content">
            <div className="cv-shell__canvas">{children}</div>
          </main>
        </div>
      </section>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <TimeRangeProvider>
      <ShellFrame>{children}</ShellFrame>
    </TimeRangeProvider>
  );
}
