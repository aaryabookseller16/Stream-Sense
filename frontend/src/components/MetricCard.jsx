export function MetricCard({ eyebrow, value, unit, detail, tone = "neutral" }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <p className="metric-card__eyebrow">{eyebrow}</p>
      <div className="metric-card__value-row">
        <strong>{value}</strong>
        {unit && <span>{unit}</span>}
      </div>
      <p className="metric-card__detail">{detail}</p>
    </article>
  );
}
