import { NavLink } from "react-router-dom";

export default function AlertSubnav() {
  return (
    <nav className="cv-settings-subnav" aria-label="告警中心导航">
      {[
        { to: "/v2/alerts/rules", label: "告警规则" },
        { to: "/v2/alerts/channels", label: "告警渠道" }
      ].map((item) => (
        <NavLink key={item.to} to={item.to}
          className={({ isActive }) => `cv-settings-subnav__item${isActive ? " cv-settings-subnav__item--active" : ""}`}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
