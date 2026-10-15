import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/v2/settings/datasource", label: "数据源配置" },
  { to: "/v2/settings/models", label: "模型配置" },
  { to: "/v2/settings/query-tokens", label: "查询 Token" }
];

export default function SettingsSubnav() {
  return (
    <nav className="cv-settings-subnav" aria-label="配置中心导航">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `cv-settings-subnav__item${isActive ? " cv-settings-subnav__item--active" : ""}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
