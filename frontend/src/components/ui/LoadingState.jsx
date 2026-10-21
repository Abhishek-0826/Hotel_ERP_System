import { Loader2 } from "../icons";

export function Spinner({ size = 18, className = "" }) {
  return <Loader2 size={size} className={`animate-spin text-brand-500 ${className}`} />;
}

export function CardSkeleton({ className = "" }) {
  return <div className={`animate-pulseSoft rounded-2xl border border-ink-100 bg-ink-100/70 ${className}`} />;
}

export default function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500">
      <Spinner size={26} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
