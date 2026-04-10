import PageLayout from "../components/layout/PageLayout";
import Table from "../components/common/Table";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: "DB" },
  { name: "POS", path: "/pos", icon: "POS" },
  { name: "Payment", path: "/payment", icon: "PAY" },
  { name: "Inventory", path: "/inventory", icon: "INV" },
  { name: "Reports", path: "/reports", icon: "REP" },
];

const rows = [
  { setting: "Store Name", value: "Freshmart Supermarket" },
  { setting: "Currency", value: "USD" },
  { setting: "Tax Mode", value: "VAT Inclusive" },
];

function Settings() {
  return (
    <PageLayout
      title="Settings"
      subtitle="Store-level preferences and operational defaults."
      searchPlaceholder="Search settings..."
      user={{ name: "Michael", role: "Administrator", initials: "MY" }}
      sidebarTitle="Supermarket POS"
      sidebarSubtitle="Retail Manager"
      navItems={navItems}
    >
      <section className="dashboard">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Configuration</h3>
          </div>
          <Table
            columns={[
              { key: "setting", label: "Setting" },
              { key: "value", label: "Value" },
            ]}
            rows={rows}
          />
        </div>
      </section>
    </PageLayout>
  );
}

export default Settings;
