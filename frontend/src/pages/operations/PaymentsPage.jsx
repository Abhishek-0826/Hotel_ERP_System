import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { bookingApi } from "../../api/bookings";
import { financeApi } from "../../api/operations";
import DataTable from "../../components/ui/DataTable";
import KpiCard from "../../components/ui/KpiCard";
import { CreditCard, DollarSign, Receipt, Wallet } from "../../components/icons";
import { useApi } from "../../hooks/useApi";
import { Field, Header, Notice, Shell, Status, useAction } from "../GeneratedPages";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
const ONLINE_METHODS = [["UPI", "UPI"], ["CARD", "Card"], ["NET_BANKING", "Net banking"]];
const isCash = (method) => method === "CASH" || method === "COD";

// yyyy-mm-dd in the user's own timezone (toISOString would shift the date near midnight).
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dayRange = (value) => {
  const start = new Date(`${value}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
};

// Type to filter by booking code, guest or amount; click (or Enter on the first match) to pick.
function BookingPicker({ bookings, value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const label = (b) => `${b.bookingCode} · ${b.guestName || "Guest"} · ${money(b.totalAmount)}`;
  const selected = bookings.find((b) => String(b.id) === String(value));
  const needle = query.trim().toLowerCase();
  const matches = needle ? bookings.filter((b) => label(b).toLowerCase().includes(needle)) : bookings;
  const pick = (b) => { onChange(String(b.id)); setQuery(""); setOpen(false); };

  return (
    <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(""); } }}>
      <input
        className="input"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder="Search booking code, guest or amount"
        value={open ? query : (selected ? label(selected) : "")}
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); if (value) onChange(""); }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && open) { event.preventDefault(); if (matches[0]) pick(matches[0]); }
          if (event.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-ink-200 bg-white py-1 shadow-lg">
          {matches.length ? matches.map((b) => (
            <li key={b.id} role="option" aria-selected={String(b.id) === String(value)} tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => pick(b)} className="cursor-pointer px-3 py-2 text-sm hover:bg-brand-50">{label(b)}</li>
          )) : <li className="px-3 py-2 text-sm text-ink-500">No matching bookings</li>}
        </ul>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  const [day, setDay] = useState(localDate());
  const [bookingId, setBookingId] = useState("");
  const [cash, setCash] = useState("");
  const [online, setOnline] = useState("");
  const { busy, run } = useAction();

  const { data: payments, loading, error, reload } = useApi(() => financeApi.payments(dayRange(day)), [], { deps: [day] });
  const { data: bookings } = useApi(() => bookingApi.ownerListAll(), []);
  // The API only accepts payments for confirmed / in-stay / completed bookings.
  const payable = bookings.filter((b) => ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(b.status) && b.paymentStatus !== "PAID");
  const selected = payable.find((b) => String(b.id) === String(bookingId));
  const { data: history, reload: reloadHistory } = useApi(() => (bookingId ? financeApi.payments({ bookingId }) : Promise.resolve([])), [], { deps: [bookingId] });

  const paidBefore = history.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = selected ? Math.max(0, Number(selected.totalAmount) - paidBefore) : 0;
  const cashAmount = Number(cash) || 0;
  const onlineAmount = Number(online) || 0;
  const entered = cashAmount + onlineAmount;
  const remaining = balance - entered;

  const totals = useMemo(() => {
    const paid = payments.filter((p) => p.status === "PAID");
    const sum = (rows) => rows.reduce((total, p) => total + Number(p.amount), 0);
    return { all: sum(paid), cash: sum(paid.filter((p) => isCash(p.method))), online: sum(paid.filter((p) => !isCash(p.method))), count: paid.length };
  }, [payments]);

  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const splits = [];
    if (cashAmount > 0) splits.push({ method: "CASH", amount: cashAmount });
    if (onlineAmount > 0) splits.push({ method: values.onlineMethod, amount: onlineAmount, ...(values.transactionRef ? { transactionRef: values.transactionRef } : {}) });
    run(
      () => financeApi.collectPayment({ bookingId, splits, ...(values.notes ? { notes: values.notes } : {}) }),
      "Payment collected",
      () => { form.reset(); setCash(""); setOnline(""); setBookingId(""); reload(); reloadHistory(); },
    );
  };

  const invalid = !selected || entered <= 0 || remaining < -0.001;
  const isToday = day === localDate();

  return (
    <Shell title="Payments">
      <Header title="Payments" text="Collect a payment — in cash, online, or split between both — and review any day's collections." />
      <Notice error={error} />

      <form onSubmit={submit} className="card mb-6 space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="field md:col-span-2">
            <span className="label">Booking</span>
            <BookingPicker bookings={payable} value={bookingId} onChange={(id) => { setBookingId(id); setCash(""); setOnline(""); }} />
          </div>
          {selected && (
            <div className="grid gap-3 rounded-xl bg-ink-50 p-3 text-sm sm:grid-cols-3 md:col-span-2">
              <p><span className="text-ink-500">Total</span><br /><b>{money(selected.totalAmount)}</b></p>
              <p><span className="text-ink-500">Already paid</span><br /><b>{money(paidBefore)}</b></p>
              <p><span className="text-ink-500">Balance due</span><br /><b className="text-brand-600">{money(balance)}</b></p>
            </div>
          )}
          <Field label="Cash amount (₹)" name="cashAmount" type="number" min="0" step="0.01" required={false} value={cash} onChange={(event) => setCash(event.target.value)} placeholder="0" />
          <Field label="Online amount (₹)" name="onlineAmount" type="number" min="0" step="0.01" required={false} value={online} onChange={(event) => setOnline(event.target.value)} placeholder="0" />
          <label className="field">
            <span className="label">Online method</span>
            <select name="onlineMethod" className="input" disabled={onlineAmount <= 0}>{ONLINE_METHODS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
          </label>
          <Field label="Online transaction reference" name="transactionRef" required={false} disabled={onlineAmount <= 0} placeholder="UTR / reference (optional)" />
          <Field label="Notes" name="notes" required={false} maxLength="500" />
        </div>

        {selected && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span>Collecting: <b>{money(entered)}</b> <span className="text-ink-500">({money(cashAmount)} cash + {money(onlineAmount)} online)</span></span>
            <span className={remaining < -0.001 ? "font-semibold text-rose-600" : "text-ink-500"}>{remaining < -0.001 ? `Exceeds balance by ${money(-remaining)}` : `Left after this: ${money(remaining)}`}</span>
            <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => { setCash(String(balance)); setOnline(""); }}>All cash</button>
            <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => { setOnline(String(balance)); setCash(""); }}>All online</button>
          </div>
        )}
        <button disabled={busy || invalid} className="btn-primary">{busy ? "Saving…" : "Collect payment"}</button>
      </form>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-ink-900">{isToday ? "Today's payments" : `Payments on ${new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`}</h2>
            <p className="text-sm text-ink-500">Everything collected on the selected day.</p>
          </div>
          <label className="field">
            <span className="label">Date</span>
            <input type="date" className="input py-2" value={day} max={localDate()} onChange={(event) => event.target.value && setDay(event.target.value)} />
          </label>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total collected" value={money(totals.all)} icon={DollarSign} color="green" />
          <KpiCard label="Cash" value={money(totals.cash)} icon={Wallet} color="orange" />
          <KpiCard label="Online" value={money(totals.online)} icon={CreditCard} color="blue" />
          <KpiCard label="Payments" value={totals.count} icon={Receipt} color="brand" />
        </div>

        {loading ? <p>Loading payments…</p> : (
          <div className="card p-4">
            <DataTable data={payments} columns={[
              { key: "date", label: "Time", render: (value) => (value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—") },
              { key: "paymentCode", label: "Payment" },
              { key: "invoiceNumber", label: "Invoice", render: (value) => (value ? <Link className="font-semibold text-brand-600 hover:underline" to={`/invoices/${encodeURIComponent(value)}`}>{value}</Link> : "—") },
              { key: "bookingCode", label: "Booking" },
              { key: "guestName", label: "Guest" },
              { key: "method", label: "Method", render: (value) => (isCash(value) ? "Cash" : String(value).replace("_", " ")) },
              { key: "amount", label: "Amount", render: money },
              { key: "receivedBy", label: "Received by" },
              { key: "status", label: "Status", render: (value) => <Status value={value} /> },
            ]} />
          </div>
        )}
      </section>
    </Shell>
  );
}
