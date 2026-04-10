function StatCard({
  label,
  value,
  meta,
  tone = "default",
  icon,
}) {
  return (
    <article className={`ui-stat-card ui-stat-${tone}`}>
      <div className="ui-stat-topline">
        <span className="ui-stat-label">{label}</span>
        {icon ? <span className="ui-stat-icon">{icon}</span> : null}
      </div>
      <strong className="ui-stat-value">{value}</strong>
      {meta ? <span className="ui-stat-meta">{meta}</span> : null}
    </article>
  );
}

export default StatCard;
