export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <div className="card compact">
      <div className="kicker">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="muted">{detail}</div>
    </div>
  )
}
