function ReceiptPanel({ lines, total }) {
  return (
    <section className="panel-card receipt-card">
      <div className="panel-heading">
        <h3>Receipt Preview</h3>
      </div>
      <div className="data-table">
        {lines.map(([item, detail, amount]) => (
          <div key={item} className="table-row">
            <span>{item}</span>
            <span>{detail}</span>
            <span>{amount}</span>
          </div>
        ))}
      </div>
      <div className="summary-stack">
        <div className="summary-line total">
          <span>Total</span>
          <strong>{total}</strong>
        </div>
      </div>
    </section>
  );
}

export default ReceiptPanel;
