import PageLayout from "../components/layout/PageLayout";
import Table from "../components/common/Table";
import { auditRows } from "../data/mockData";

function AuditLogs() {
  return (
    <PageLayout
      title="Audit Logs"
      subtitle="A lightweight record of system changes and user actions."
      badge="Security"
    >
      <section className="panel-card">
        <div className="panel-heading">
          <h3>Recent Events</h3>
        </div>
        <Table columns={["Time", "Action", "Actor"]} rows={auditRows} />
      </section>
    </PageLayout>
  );
}

export default AuditLogs;
