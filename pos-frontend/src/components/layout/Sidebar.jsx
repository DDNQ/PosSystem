import { NavLink } from "react-router-dom";

const defaultNavItems = [
  { name: "Dashboard", path: "/dashboard", icon: "DB" },
  { name: "Point of Sale", path: "/pos", icon: "PS", disabled: true },
  { name: "Inventory", path: "/inventory", icon: "IV", disabled: true },
  { name: "Reports", path: "/reports", icon: "RP", disabled: true },
  { name: "Users", path: "/users", icon: "US", disabled: true },
  { name: "Settings", path: "/settings", icon: "ST", disabled: true },
];

function Sidebar({
  title = "POS System",
  subtitle = "Retail Manager",
  navItems = defaultNavItems,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">P</div>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navItems.map((item) =>
          item.disabled ? (
            <div key={item.name} className="nav-link nav-link-disabled">
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.name}</span>
            </div>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.name}</span>
            </NavLink>
          )
        )}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-status-dot" aria-hidden="true" />
        <div>
          <strong>System Online</strong>
          <p>Syncing sales and inventory</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
