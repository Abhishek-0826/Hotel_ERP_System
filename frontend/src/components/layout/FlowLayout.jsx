import { useNavigate } from "react-router-dom";
import Brand from "./Navbar";

export default function FlowLayout({ step, total = 3, children }) {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-grid bg-[#faf8f5] py-10">
      <section className="mx-auto w-full max-w-xl px-4">
        <div className="mb-5 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-sm font-semibold text-ink-500 hover:text-ink-800">← Back</button>
          <Brand />
          <span className="w-10" />
        </div>
        <p className="eyebrow mb-2 text-center">STEP {step} OF {total}</p>
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(step / total) * 100}%` }} />
        </div>
        <article className="card p-6 sm:p-8">{children}</article>
      </section>
    </main>
  );
}
