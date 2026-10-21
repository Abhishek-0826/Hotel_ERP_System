import { X } from "../icons";

export default function Modal({ open, onClose, title, children, footer, size = "md" }) {
  if (!open) return null;
  const width = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4 animate-fadeIn" onClick={onClose}>
      <div
        className={`flex max-h-[90vh] w-full ${width} flex-col rounded-2xl bg-white p-6 shadow-pop`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h3 className="text-lg font-bold text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
            <X size={18} />
          </button>
        </div>
        <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
