// Reusable KPI stat card component
export default function KpiCard({ label, value, sub, icon: Icon, color = "brand", trend }) {
  const colorMap = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-amber-50 text-amber-600",
    red: "bg-rose-50 text-rose-600",
    blue: "bg-sky-50 text-sky-600",
    purple: "bg-violet-50 text-violet-600",
    ink: "bg-ink-100 text-ink-600",
  };
  const iconBg = colorMap[color] || colorMap.brand;

  return (
    <article className="card p-4 flex items-start gap-4">
      {Icon && (
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500 truncate">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold text-ink-900 leading-tight">{value ?? "—"}</p>
        {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
        {trend !== undefined && (
          <p className={`mt-1 text-[11px] font-semibold ${trend >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last week
          </p>
        )}
      </div>
    </article>
  );
}
