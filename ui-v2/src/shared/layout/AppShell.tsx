import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { TimeRangeProvider } from "../state/TimeRangeContext";
import VersionSwitcher from "./VersionSwitcher";

const primaryNavigation = [
  { to: "/v2/overview", label: "总览大盘", icon: "◫" },
  { to: "/v2/query", label: "日志查询", icon: "⌘" },
  { to: "/v2/reports", label: "定时报表", icon: "◌" },
  { to: "/v2/alerts/rules", label: "告警中心", icon: "!" },
  { to: "/v2/settings/datasource", label: "配置中心", icon: "⋯" },
  { to: "/v2/permission/users", label: "权限中心", icon: "⌥" }
] as const;

function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="cv-shell">
      <section className="cv-shell__main">
        <header className="cv-shell__topbar" data-testid="app-shell-topbar">
          <div className="cv-shell__topbar-inner">
            <div className="cv-shell__topbar-start">
              <div className="cv-shell__brand">
                <div className="cv-shell__brand-mark" aria-hidden="true">
                  CH
                </div>
                <div className="cv-shell__brand-copy">
                  <span className="cv-shell__brand-title">ClickHouse</span>
                  <span className="cv-shell__brand-subtitle">Log Engine</span>
                </div>
              </div>
              <nav aria-label="v2 主导航" className="cv-shell__nav" data-testid="app-shell-nav">
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
            </div>
            <div className="cv-shell__topbar-actions">
              <VersionSwitcher />
            </div>
          </div>
        </header>
        <div className="cv-shell__workspace">
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
