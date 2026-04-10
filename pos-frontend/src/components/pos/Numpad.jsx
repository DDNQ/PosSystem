function Numpad() {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"];

  return (
    <section className="panel-card">
      <div className="panel-heading">
        <h3>Numpad</h3>
      </div>
      <div className="numpad-grid">
        {keys.map((key) => (
          <button key={key} type="button" className="numpad-key">
            {key}
          </button>
        ))}
      </div>
    </section>
  );
}

export default Numpad;
