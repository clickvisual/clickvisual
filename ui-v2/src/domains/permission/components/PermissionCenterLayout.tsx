import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const permissionTabs = [
  { to: "/v2/permission/users", label: "用户与授权" },
  { to: "/v2/permission/roles", label: "角色配置" },
  { to: "/v2/permission/resources", label: "资源范围" },
  { to: "/v2/permission/root", label: "Root 管理" }
] as const;

export default function PermissionCenterLayout({
  title,
  description: _description,
  summary,
  children
}: {
  title: string;
  description: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <section className="cv-page cv-permission-page">
      <header className="cv-page-toolbar">
        <div className="cv-page-toolbar__main">
          <div className="cv-breadcrumb" aria-label="页面路径">
            <span>权限</span>
            <span aria-hidden="true">/</span>
            <span className="cv-breadcrumb__current">权限中心</span>
          </div>
          <h1 className="cv-page-title cv-sr-only">权限中心</h1>
        </div>
        <div className="cv-permission-tablist" role="tablist" aria-label="权限中心导航">
          {permissionTabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `cv-permission-tab${isActive ? " cv-permission-tab--active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>

      <section className="cv-panel cv-permission-panel">
        <div className="cv-panel-header cv-permission-panel-header">
          <div className="cv-permission-panel-header__copy">
            <h2 className="cv-panel-title">{title}</h2>
            {summary ? <span className="cv-permission-summary-chip">{summary}</span> : null}
          </div>
        </div>
        {children}
      </section>
    </section>
  );
}
