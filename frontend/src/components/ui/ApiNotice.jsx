import { Sparkles } from "../icons";

// Small, calm banner used whenever a screen is showing demo/fallback data
// because a backend endpoint isn't reachable yet — never a scary red error.
export default function ApiNotice({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-xs font-medium text-brand-700">
      <Sparkles size={14} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}
