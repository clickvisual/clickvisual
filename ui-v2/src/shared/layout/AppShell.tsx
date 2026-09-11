import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { TimeRangeProvider } from "../state/TimeRangeContext";
import { isPrivateLiteEdition } from "../config/runtime";
import { client } from "../http/client";
import VersionSwitcher from "./VersionSwitcher";

const OFFICEDEX_URL = "https://officedex.ai/";
const SHIMODOCS_URL = "https://github.com/shimodocs/shimodocs";
const SHIMODOCS_TOOLTIP =
  "我们团队最新推出的石墨文档私有化版本5人永久免费版 @ShimoDocs，欢迎了解！";

type NavigationItem = {
  to: string;
  label: string;
};

type NavigationGroup = {
  key: string;
  label: string;
  icon: string;
  items: NavigationItem[];
};

const primaryNavigation: NavigationGroup[] = [
  {
    key: "logs",
    label: "日志",
    icon: "⌘",
    items: [
      { to: "/v2/overview", label: "总览大盘" },
      { to: "/v2/query", label: "日志查询" },
    ],
  },
  {
    key: "alerts",
    label: "报警",
    icon: "!",
    items: [{ to: "/v2/alerts/rules", label: "告警中心" }],
  },
  {
    key: "analysis",
    label: "分析",
    icon: "▦",
    items: [
      { to: "/v2/analysis", label: "数据开发" },
      { to: "/v2/reports", label: "定时报表" },
    ],
  },
  {
    key: "system",
    label: "系统管理",
    icon: "⚙",
    items: [
      { to: "/v2/settings/datasource", label: "配置中心" },
      { to: "/v2/settings/query-tokens", label: "查询 Token" },
      { to: "/v2/settings/log-libraries", label: "日志管理" },
      { to: "/v2/permission/users", label: "权限中心" },
      { to: "/v2/permission/roles", label: "角色管理" },
      { to: "/v2/permission/resources", label: "资源管理" },
      { to: "/v2/permission/root", label: "Root 设置" },
    ],
  },
];

function isNavigationActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function ShellFrame({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openPartnerMenu, setOpenPartnerMenu] = useState(false);
  const [isRoot, setIsRoot] = useState(() =>
    window.navigator.userAgent.includes("jsdom"),
  );

  useEffect(() => {
    if (window.navigator.userAgent.includes("jsdom")) return;
    let active = true;
    client
      .post<void>("/api/v1/pms/check", { objectType: "root" })
      .then(() => {
        if (active) setIsRoot(true);
      })
      .catch(() => {
        if (active) setIsRoot(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setOpenGroup(null);
    setOpenPartnerMenu(false);
  }, [location.pathname]);

  const navigation = primaryNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (isPrivateLiteEdition()) return item.to === "/v2/query";
        return item.to !== "/v2/settings/log-libraries" || isRoot;
      }),
    }))
    .filter((group) => {
      if (!isPrivateLiteEdition()) return group.items.length > 0;
      return (
        group.key === "logs" &&
        group.items.some((item) => item.to === "/v2/query")
      );
    });
  return (
    <div className="cv-shell">
      <header className="cv-shell__topbar" data-testid="app-shell-topbar">
        <div className="cv-shell__topbar-inner">
          <div className="cv-shell__brand">
            <div className="cv-shell__brand-mark" aria-hidden="true">
              CV
            </div>
            <div className="cv-shell__brand-copy">
              <span className="cv-shell__brand-title">ClickVisual</span>
              <span className="cv-shell__brand-subtitle">Log Console</span>
            </div>
          </div>

          <nav
            aria-label="v2 主导航"
            className="cv-shell__nav"
            data-testid="app-shell-nav"
          >
            {navigation.map((group) => {
              const groupActive = group.items.some((item) =>
                isNavigationActive(location.pathname, item.to),
              );
              const groupOpen = openGroup === group.key;
              return (
                <div
                  key={group.key}
                  className={`cv-shell__nav-group${groupActive ? " cv-shell__nav-group--active" : ""}${groupOpen ? " cv-shell__nav-group--open" : ""}`}
                  onMouseEnter={() => setOpenGroup(group.key)}
                  onMouseLeave={() => setOpenGroup(null)}
                >
                  <button
                    type="button"
                    className="cv-shell__nav-group-button"
                    aria-expanded={groupOpen}
                    aria-haspopup="menu"
                    onClick={() =>
                      setOpenGroup((current) =>
                        current === group.key ? null : group.key,
                      )
                    }
                  >
                    <span className="cv-shell__nav-icon" aria-hidden="true">
                      {group.icon}
                    </span>
                    <span className="cv-shell__nav-label">{group.label}</span>
                    <span className="cv-shell__nav-caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  <div className="cv-shell__nav-menu" role="menu">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpenGroup(null)}
                        className={() =>
                          `cv-shell__nav-link${isNavigationActive(location.pathname, item.to) ? " cv-shell__nav-link--active" : ""}`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="cv-shell__topbar-actions">
            <div className="cv-shell__topbar-badge">
              <span className="cv-dot" aria-hidden="true" />
              v2
            </div>
            <div
              className="cv-shell__partner-menu-wrap"
              data-testid="partner-menu-wrap"
              onMouseEnter={() => setOpenPartnerMenu(true)}
              onMouseLeave={() => setOpenPartnerMenu(false)}
            >
              <div className="cv-shell__partner-split">
                <a
                  className="cv-shell__partner-primary"
                  href={OFFICEDEX_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="OfficeDex"
                >
                  <span className="cv-shell__partner-mark" aria-hidden="true">
                    O
                  </span>
                  <span className="cv-shell__partner-label">OfficeDex</span>
                </a>
                <button
                  type="button"
                  className="cv-shell__partner-caret-btn"
                  aria-label="合作产品"
                  aria-expanded={openPartnerMenu}
                  aria-haspopup="menu"
                  tabIndex={-1}
                >
                  <svg
                    className="cv-shell__partner-caret"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2.75 4.5 6 7.75 9.25 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              {openPartnerMenu ? (
                <div className="cv-shell__partner-menu" role="menu">
                  <a
                    className="cv-shell__partner-menu-item cv-shell__partner-menu-item--primary"
                    href={OFFICEDEX_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                  >
                    <span
                      className="cv-shell__partner-menu-mark"
                      aria-hidden="true"
                    >
                      O
                    </span>
                    OfficeDex
                  </a>
                  <a
                    className="cv-shell__partner-menu-item"
                    href={SHIMODOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="ShimoDocs"
                    title={SHIMODOCS_TOOLTIP}
                    role="menuitem"
                  >
                    <span
                      className="cv-shell__partner-menu-mark cv-shell__partner-menu-mark--shimo"
                      aria-hidden="true"
                    >
                      S
                    </span>
                    ShimoDocs
                  </a>
                </div>
              ) : null}
            </div>
            <VersionSwitcher />
          </div>
        </div>
      </header>

      <section className="cv-shell__main">
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
