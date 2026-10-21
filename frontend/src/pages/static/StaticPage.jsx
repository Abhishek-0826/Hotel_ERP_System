import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";

export default function StaticPage({ eyebrow, title, children }) {
  return (
    <>
      <Navbar />
      <main className="container-page py-16">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-ink-900">{title}</h1>
        <div className="mt-6 max-w-2xl space-y-4 text-[15px] leading-relaxed text-ink-600">{children}</div>
      </main>
      <Footer />
    </>
  );
}
