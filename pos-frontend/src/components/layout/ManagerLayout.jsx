import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  Box,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Monitor,
  ShoppingBag,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import "../../styles/dashboard.css";
import "../../styles/inventory.css";
import { clearStoredUser, getStoredUser, roleLabels, ROLES } from "../../utils/auth";

const navItemsByRole = {
  [ROLES.ADMIN]: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Manage Users", path: "/user-management", icon: Users },
    { label: "Products", path: "/inventory", icon: Box },
    { label: "Reports", path: "/reports", icon: ReceiptText },
    { label: "All Sales", path: "/all-sales", icon: ClipboardList },
  ],
  [ROLES.MANAGER]: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Products", path: "/inventory", icon: ShoppingBag },
    { label: "Reports", path: "/reports", icon: ReceiptText },
    { label: "Customer History", path: "/customer-history", icon: Users },
    { label: "Cashier Performance", path: "/cashier-performance", icon: TrendingUp },
  ],
};

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ManagerLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: "Robert Miller",
    role: ROLES.MANAGER,
  });

  useEffect(() => {
    const storedUser = getStoredUser();

    if (storedUser?.name && storedUser?.role) {
      setUser({
        name: storedUser.name,
        role: storedUser.role,
      });
    }
  }, []);

  const currentRole = user.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.MANAGER;
  const navItems = useMemo(() => navItemsByRole[currentRole], [currentRole]);
  const userName = user.name || "Robert Miller";
  const userInitials = getInitials(userName) || "RM";
  const shellCopy =
    currentRole === ROLES.ADMIN
      ? {
          kicker: "Admin Control",
          title: "Administration Hub",
          subtitle: "Access to users, catalog, sales, and reporting",
        }
      : {
          kicker: "Retail Control",
          title: "Operations Hub",
          subtitle: "Day-to-day store performance and floor operations",
        };

  return (
    <main className="manager-shell">
      <section className="manager-frame">
        <aside className="manager-sidebar">
          <div className="manager-sidebar-brand">
            <span className="manager-sidebar-kicker">{shellCopy.kicker}</span>
            <strong>{shellCopy.title}</strong>
            <p>{shellCopy.subtitle}</p>
          </div>

          <nav
            className="manager-nav"
            aria-label={`${roleLabels[currentRole]} navigation`}
          >
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `manager-nav-link${isActive ? " is-active" : ""}`
                  }
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="inventory-support-card">
            <p>Support</p>
            <button type="button">Help Center</button>
          </div>
        </aside>

        <div className="manager-main">
          <header className="manager-header">
            <div className="manager-brand">
              <div className="manager-brand-mark">
                <ShoppingCart size={20} />
              </div>
              <h1>Supermarket POS</h1>
              <div className="manager-chip">
                <Monitor size={15} />
                <span>Terminal: MAIN-OFFICE-01</span>
              </div>
            </div>

            <div className="manager-header-actions">
              <button type="button" className="manager-icon-button" aria-label="Notifications">
                <Bell size={18} />
                <span className="manager-notification-dot" aria-hidden="true" />
              </button>

              <div className="manager-user-block">
                <div className="manager-user-copy">
                  <strong>{userName}</strong>
                  <span>{roleLabels[currentRole]}</span>
                </div>
                <div className="manager-user-avatar">{userInitials}</div>
              </div>

              <button
                type="button"
                className="manager-icon-button"
                aria-label="Log out"
                onClick={() => {
                  clearStoredUser();
                  navigate("/");
                }}
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>

          <Outlet context={{ userName, role: currentRole }} />
        </div>
      </section>
    </main>
  );
}

export default ManagerLayout;
