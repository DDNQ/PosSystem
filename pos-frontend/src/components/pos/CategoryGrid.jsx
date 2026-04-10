import Badge from "../common/Badge";

function CategoryGrid({ items }) {
  return (
    <section className="panel-card">
      <div className="panel-heading">
        <h3>Categories</h3>
        <Badge>{items.length} groups</Badge>
      </div>
      <div className="category-grid">
        {items.map((item) => (
          <article key={item.name} className="category-tile">
            <strong>{item.name}</strong>
            <span className="muted">{item.count} items</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CategoryGrid;
