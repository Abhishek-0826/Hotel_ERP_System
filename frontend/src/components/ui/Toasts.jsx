import { CheckCircle2, AlertTriangle, X, Sparkles } from "../icons";
import { useAppState } from "../../context/AppStateContext";

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Sparkles };
const STYLES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-brand-200 bg-brand-50 text-brand-800",
};

export default function Toasts() {
  const { toasts, dismissToast } = useAppState();
  if (!toasts.length) return null;
  return (
    <div className="fixed right-5 top-5 z-[60] flex w-[calc(100%-2.5rem)] max-w-md flex-col gap-3">
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Sparkles;
        return (
          <div key={t.id} className={`flex min-h-[72px] items-start gap-3 rounded-xl border px-5 py-4 shadow-pop animate-fadeIn ${STYLES[t.type] || STYLES.info}`}>
            <Icon size={20} className="mt-0.5 shrink-0" />
            <div className="flex-1 text-base">
              {t.title && <p className="font-semibold">{t.title}</p>}
              {t.message && <p className="mt-0.5 text-sm opacity-90">{t.message}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="opacity-60 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
