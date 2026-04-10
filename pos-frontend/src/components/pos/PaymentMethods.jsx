function PaymentMethods({ methods }) {
  return (
    <section className="panel-card accent-panel">
      <div className="panel-heading">
        <h3>Payment Methods</h3>
      </div>
      <div className="summary-stack">
        {methods.map((method) => (
          <div key={method.name} className="summary-line">
            <span>{method.name}</span>
            <strong>{method.share}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PaymentMethods;
