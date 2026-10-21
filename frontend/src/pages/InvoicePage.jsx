import { Link, useParams } from "react-router-dom";
import { financeApi } from "../api/operations";
import { ArrowLeft, Printer } from "../components/icons";
import { useApi } from "../hooks/useApi";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));

export default function InvoicePage() {
  const { id } = useParams();
  const { data: invoice, loading, error } = useApi(() => financeApi.invoice(id), null, { deps: [id] });

  if (loading) return <main className="grid min-h-screen place-items-center bg-ink-50">Loading invoice...</main>;
  if (!invoice) return <main className="grid min-h-screen place-items-center bg-ink-50 px-4"><div className="card max-w-lg p-8 text-center"><h1 className="text-xl font-bold">Invoice unavailable</h1><p className="mt-2 text-sm text-ink-500">{error || "No matching invoice was found."}</p><Link className="btn-primary mt-5" to="/invoices">Invoice lookup</Link></div></main>;

  return (
    <main className="min-h-screen bg-ink-50 px-4 py-8 print:bg-white">
      <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between print:hidden">
        <Link to="/invoices" className="flex items-center gap-1 text-sm font-semibold text-ink-600"><ArrowLeft size={16} /> Back</Link>
        <button onClick={() => window.print()} className="btn-primary"><Printer size={15} /> Print / Save PDF</button>
      </div>
      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm print:shadow-none">
        <header className="flex items-start justify-between border-b border-ink-100 pb-6">
          <div><h1 className="text-3xl font-extrabold text-brand-600">ROOST</h1><p className="mt-1 text-sm text-ink-500">Official payment invoice</p></div>
          <div className="text-right"><p className="eyebrow">Invoice</p><p className="mt-1 text-xl font-bold">{invoice.invoiceNumber}</p><p className="text-sm text-ink-500">{invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "—"}</p></div>
        </header>
        <section className="mt-6 grid gap-5 sm:grid-cols-2">
          <div><p className="label">Billed to</p><p className="font-bold">{invoice.guest?.name || "Guest"}</p><p className="text-sm text-ink-500">{invoice.guest?.email || "—"}</p><p className="text-sm text-ink-500">{invoice.guest?.phone || "—"}</p></div>
          <div><p className="label">Booking</p><p className="font-bold">#{invoice.bookingId}</p><p className="text-sm text-ink-500">Status: {invoice.status}</p></div>
        </section>
        <table className="mt-8 w-full text-sm"><tbody><tr className="border-b"><td className="py-3">Accommodation subtotal</td><td className="py-3 text-right">{money(invoice.subtotal)}</td></tr><tr className="border-b"><td className="py-3">Tax</td><td className="py-3 text-right">{money(invoice.taxAmount)}</td></tr><tr><td className="pt-4 text-lg font-extrabold">Total</td><td className="pt-4 text-right text-lg font-extrabold text-brand-600">{money(invoice.totalAmount)}</td></tr></tbody></table>
      </article>
    </main>
  );
}
