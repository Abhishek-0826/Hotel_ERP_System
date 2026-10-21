import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { receptionApi } from "../../api/operations";
import QrScanner from "../../components/booking/QrScanner";
import { Camera, CheckCircle2 } from "../../components/icons";
import { useApi } from "../../hooks/useApi";
import { parseBookingCode } from "../../utils/qr";
import { Field, Header, Notice, Shell, Status, useAction } from "../GeneratedPages";

export const ID_DOCUMENT_TYPES = [
  ["AADHAAR", "Aadhaar card"],
  ["PASSPORT", "Passport"],
  ["DRIVING_LICENCE", "Driving licence"],
  ["VOTER_ID", "Voter ID"],
  ["PAN", "PAN card"],
  ["OTHER", "Other government ID"],
];

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
const day = (value) => (value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

function ReadOnly({ label, value }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input readOnly tabIndex={-1} value={value ?? ""} placeholder="—" className="input cursor-default bg-ink-50 text-ink-700" />
    </label>
  );
}

function FindBooking({ onFind }) {
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const handleScan = useCallback((text) => {
    setScanning(false);
    const parsed = parseBookingCode(text);
    if (parsed) onFind(parsed);
    else setCode(String(text).slice(0, 60));
  }, [onFind]);

  return (
    <div className="max-w-xl space-y-4">
      {scanning
        ? <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />
        : (
          <button type="button" onClick={() => setScanning(true)} className="btn-primary w-full py-3"><Camera size={18} /> Scan guest QR code</button>
        )}
      <form onSubmit={(event) => { event.preventDefault(); const typed = parseBookingCode(code) || code.trim(); if (typed) onFind(typed); }} className="card space-y-4 p-5">
        <p className="text-sm text-ink-500">No QR handy? Enter the booking code instead.</p>
        <Field label="Booking code" name="bookingCode" value={code} onChange={(event) => setCode(event.target.value)} placeholder="ROOST-XXXXXX" />
        <button className="btn-outline">Find booking</button>
      </form>
    </div>
  );
}

function CheckInForm({ code, onDone }) {
  const { busy, run } = useAction();
  const { data: booking, loading, error } = useApi(() => receptionApi.booking(code), null, { deps: [code] });
  const [idType, setIdType] = useState(null);
  const [idNumber, setIdNumber] = useState(null);

  if (loading) return <p>Loading booking…</p>;
  if (!booking) return <><Notice error={error || "Booking not found."} /><button className="btn-outline" onClick={onDone}>Scan another booking</button></>;

  // Pre-fill the ID from the guest's profile, unless the receptionist already changed it.
  const type = idType ?? booking.idProofType ?? "";
  const number = idNumber ?? booking.idProofNumber ?? "";
  const alreadyIn = booking.status === "CHECKED_IN";
  const submit = (event) => {
    event.preventDefault();
    run(() => receptionApi.checkIn(booking.bookingCode, { idProofType: type, idProofNumber: number.trim() }), "Guest checked in", onDone);
  };

  const blocker = booking.canCheckIn ? null
    : booking.status === "PENDING" ? "This booking is still waiting for approval. Approve it from Bookings before checking the guest in."
      : alreadyIn ? "This guest is already checked in."
        : `This booking is ${String(booking.status).toLowerCase().replace("_", " ")} and can't be checked in.`;

  return (
    <form onSubmit={submit} className="card max-w-4xl space-y-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="label !mb-0">Booking</p><p className="text-xl font-extrabold tracking-wide text-brand-600">{booking.bookingCode}</p></div>
        <Status value={booking.status} />
      </div>
      {blocker && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{blocker}</p>}

      <section>
        <h2 className="mb-3 text-sm font-bold text-ink-800">Guest details</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <ReadOnly label="Full name" value={booking.guestName} />
          <ReadOnly label="Phone" value={booking.guestPhone} />
          <ReadOnly label="Email" value={booking.guestEmail} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-ink-800">Stay details</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <ReadOnly label="Property" value={booking.propertyName} />
          <ReadOnly label="Room" value={booking.roomName} />
          <ReadOnly label="Bed" value={booking.bedCode} />
          <ReadOnly label="Check-in" value={day(booking.checkIn)} />
          <ReadOnly label="Check-out" value={day(booking.checkOut)} />
          <ReadOnly label="Total amount" value={money(booking.totalAmount)} />
          <ReadOnly label="Paid so far" value={money(booking.paidAmount)} />
          <ReadOnly label="Payment status" value={String(booking.paymentStatus || "").replace("_", " ")} />
          <ReadOnly label="Source" value={String(booking.source || "").replace("_", " ")} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-ink-800">Identity verification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span className="label">Identity document type</span>
            <select required className="input" value={type} onChange={(event) => setIdType(event.target.value)} disabled={Boolean(blocker)}>
              <option value="" disabled>Select document type</option>
              {ID_DOCUMENT_TYPES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="label">Identity document number</span>
            <input required minLength="3" maxLength="100" className="input" value={number} onChange={(event) => setIdNumber(event.target.value)} disabled={Boolean(blocker)} placeholder="e.g. 1234 5678 9012" />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button disabled={busy || Boolean(blocker)} className="btn-primary"><CheckCircle2 size={16} /> {busy ? "Checking in…" : "Confirm check-in"}</button>
        <button type="button" className="btn-outline" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

export default function CheckInPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get("code");
  const open = useCallback((value) => navigate(`/check-in?code=${encodeURIComponent(value)}`), [navigate]);
  const reset = useCallback(() => navigate("/check-in"), [navigate]);

  return (
    <Shell title="Check-in">
      <Header title="Guest check-in" text={code ? "Review the booking, record the guest's ID and confirm." : "Scan the guest's booking QR code or enter the booking code."} />
      {code ? <CheckInForm key={code} code={code} onDone={reset} /> : <FindBooking onFind={open} />}
    </Shell>
  );
}
