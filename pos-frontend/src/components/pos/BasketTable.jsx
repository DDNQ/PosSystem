import Badge from "../common/Badge";
import Table from "../common/Table";

function BasketTable({ rows }) {
  return (
    <section className="panel-card">
      <div className="panel-heading">
        <h3>Basket</h3>
        <Badge>{rows.length} lines</Badge>
      </div>
      <Table columns={["Item", "Qty", "Total"]} rows={rows} />
    </section>
  );
}

export default BasketTable;
