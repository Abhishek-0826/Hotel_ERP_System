import { BedDouble } from "../icons";

export default function EmptyState({ icon: Icon = BedDouble, title = "Nothing here yet", body, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400">
        <Icon size={22} />
      </div>
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {body && <p className="max-w-sm text-sm text-ink-500">{body}</p>}
      {action}
    </div>
  );
}
