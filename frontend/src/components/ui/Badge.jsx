const STYLES = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  AVAILABLE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  BOOKED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  MAINTENANCE: "bg-ink-100 text-ink-600 ring-1 ring-ink-200",
  DEFAULT: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
};

export default function Badge({ value, className = "" }) {
  const style = STYLES[String(value || "").toUpperCase()] || STYLES.DEFAULT;
  return <span className={`badge ${style} ${className}`}>{value}</span>;
}
