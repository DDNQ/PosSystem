import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import "../../styles/layout.css";

function PageLayout({
  children,
  title,
  subtitle,
  searchPlaceholder,
  user,
  action,
  sidebarTitle,
  sidebarSubtitle,
  navItems,
}) {
  return (
    <div className="app-layout">
      <Sidebar
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        navItems={navItems}
      />

      <div className="main-section">
        <Topbar
          title={title}
          subtitle={subtitle}
          searchPlaceholder={searchPlaceholder}
          userName={user?.name}
          userRole={user?.role}
          userInitials={user?.initials}
          action={action}
        />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export default PageLayout;
