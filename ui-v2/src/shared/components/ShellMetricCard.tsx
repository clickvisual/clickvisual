type ShellMetricCardProps = {
  label: string;
  value: string;
  trend: string;
};

export default function ShellMetricCard({
  label,
  value,
  trend
}: ShellMetricCardProps) {
  return (
    <article className="cv-metric-card">
      <p className="cv-metric-card__label">{label}</p>
      <p className="cv-metric-card__value">{value}</p>
      <p className="cv-metric-card__trend">{trend}</p>
    </article>
  );
}
