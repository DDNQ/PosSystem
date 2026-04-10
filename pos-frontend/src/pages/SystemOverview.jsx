import PageLayout from "../components/layout/PageLayout";
import StatCard from "../components/common/StatCard";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: "DB" },
  { name: "POS", path: "/pos", icon: "POS" },
  { name: "Payment", path: "/payment", icon: "PAY" },
  { name: "Inventory", path: "/inventory", icon: "INV" },
  { name: "Reports", path: "/reports", icon: "REP" },
];

const stats = [
  { label: "Server Uptime", value: "99.98%", meta: "Last 30 days" },
  { label: "Sync Jobs", value: "128", meta: "Completed today", tone: "primary" },
  { label: "Alerts", value: "02", meta: "Require review", tone: "success" },
];

function SystemOverview() {
  return (
    <PageLayout
      title="System Overview"
      subtitle="Operational health across sync, uptime, and alerts."
      searchPlaceholder="Search system status..."
      user={{ name: "Michael", role: "Administrator", initials: "MY" }}
      sidebarTitle="Supermarket POS"
      sidebarSubtitle="Retail Manager"
      navItems={navItems}
    >
      <section className="dashboard">
        <div className="stats-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </section>
    </PageLayout>
  );
}

export default SystemOverview;
