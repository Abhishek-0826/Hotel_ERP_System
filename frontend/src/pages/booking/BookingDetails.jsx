import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useRoostData } from "../../data/roostLocal";
import { readDemoBookings } from "../../utils/demoBookings";
import { useApi } from "../../hooks/useApi";
import { bookingApi } from "../../api/bookings";
import { DEMO_MODE } from "../../config/demo";
import { useAuth } from "../../context/AuthContext";
import { buildCheckInUrl } from "../../utils/qr";

export default function BookingDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { code } = useParams();
  const [storedDemoData] = useRoostData();
  const data = DEMO_MODE ? storedDemoData : { bookings: [], payments: [] };
  const { data: apiBooking, loading, error, setData: setApiBooking } = useApi(
    () => code ? bookingApi.get(code) : Promise.resolve(null),
    null,
    { deps: [code] }
  );

  // Find booking from state, central store, or demo bookings
  const localBooking = useMemo(() => {
    if (apiBooking) return apiBooking;
    if (location.state?.booking) return location.state.booking;
    if (!DEMO_MODE) return null;
    const matchCentral = data.bookings.find(
      (b) => b.id === code || b.bookingCode === code || b.code === code
    );
    if (matchCentral) return matchCentral;

    const demoList = readDemoBookings();
    const matchDemo = demoList.find(
      (b) => b.id === code || b.bookingCode === code || b.code === code
    );
    return matchDemo || null;
  }, [apiBooking, code, data.bookings, location.state]);

  const matchedPayment = data.payments.find(
    (p) => p.booking === code || p.booking === localBooking?.id || p.booking === localBooking?.bookingCode
  );

  const booking = localBooking
    ? {
        bookingCode: localBooking.bookingCode || localBooking.code || localBooking.id,
        property: localBooking.propertyName || localBooking.property || "—",
        location: localBooking.location || "—",
        room: localBooking.roomName || localBooking.room || localBooking.bed?.split("-")[0] || "—",
        bed: localBooking.bedCode || localBooking.bed || "—",
        position: localBooking.position || "—",
        checkIn: localBooking.checkIn,
        checkOut: localBooking.checkOut,
        nights: localBooking.nights || 1,
        guestName: localBooking.guest?.name || localBooking.guest || localBooking.guestName || "Guest",
        guestPhone: localBooking.guestPhone || "—",
        guestEmail: localBooking.guestEmail || localBooking.createdBy || "—",
        amount: localBooking.totalAmount || localBooking.amount || 0,
        paymentMethod: localBooking.paymentMethod || matchedPayment?.method || "NOT_RECORDED",
        paymentStatus: localBooking.paymentStatus || (matchedPayment?.status === "Paid" ? "PAID" : "UNPAID"),
        bookingStatus: localBooking.status || "PENDING",
        qrCode: localBooking.qrCode,
      }
    : null;

  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-50">Loading booking...</main>;
  if (!booking) return <main className="grid min-h-screen place-items-center bg-slate-50 px-4"><div className="rounded-2xl bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold">Booking not found</h1><p className="mt-2 text-sm text-slate-500">{error || "Check the booking code and try again."}</p><Link className="mt-5 inline-block rounded-xl bg-brand-500 px-4 py-2 font-semibold text-white" to="/properties">Browse properties</Link></div></main>;

  const isConfirmed = booking.bookingStatus === "Confirmed" || booking.bookingStatus === "CONFIRMED" || booking.bookingStatus === "Checked in";
  const isPaid = booking.paymentStatus === "PAID" || booking.paymentStatus === "Paid";

  // One stable QR per booking: it opens the pre-filled check-in form when the front desk scans it.
  const qrValue = buildCheckInUrl(booking.bookingCode);
  const showQr = !["CANCELLED", "REJECTED", "COMPLETED", "Cancelled", "Completed"].includes(booking.bookingStatus);

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const guestEmail = user ? undefined : window.prompt("Enter the email used for this booking:");
      if (!user && !guestEmail) return;
      const updated = await bookingApi.cancel(booking.bookingCode, "Cancelled by guest", guestEmail);
      setApiBooking(updated);
      window.alert("Booking cancelled.");
    } catch (error) {
      window.alert(error.message);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("booking-qr-svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ROOST-QR-${booking.bookingCode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Roost</h1>
            <p className="text-sm text-slate-500">Booking details</p>
          </div>
          <button
            onClick={() => navigate("/my-bookings")}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← My Bookings
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Title */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-900">Booking Details</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              booking.bookingStatus === "Confirmed" || booking.bookingStatus === "CONFIRMED"
                ? "bg-emerald-50 text-emerald-700"
                : booking.bookingStatus === "Cancelled"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {booking.bookingStatus}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Booking ID:{" "}
            <span className="font-semibold text-slate-700">{booking.bookingCode}</span>
          </p>
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left */}
          <div className="space-y-6 lg:col-span-2">
            {/* Property */}
            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-brand-50 to-brand-50 text-brand-400 text-5xl">
                🏠
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{booking.property}</h3>
                    <p className="mt-1 text-sm text-slate-500">📍 {booking.location}</p>
                  </div>
                  <div className="rounded-xl bg-brand-50 px-4 py-2 text-center">
                    <p className="text-xs text-brand-500">Total</p>
                    <p className="text-xl font-bold text-brand-600">₹{booking.amount}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Stay details */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Stay Details</h3>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Info label="Check-in" value={booking.checkIn} />
                <Info label="Check-out" value={booking.checkOut} />
                <Info label="Room" value={booking.room} />
                <Info label="Bed" value={`${booking.bed}${booking.position !== "—" ? ` • ${booking.position}` : ""}`} />
                <Info label="Duration" value={`${booking.nights} night${booking.nights !== 1 ? "s" : ""}`} />
                <Info label="Booking ID" value={booking.bookingCode} />
              </div>
            </section>

            {/* Guest */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Guest Information</h3>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Info label="Guest Name" value={booking.guestName} />
                <Info label="Phone" value={booking.guestPhone} />
                <Info label="Email" value={booking.guestEmail} />
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Payment</h3>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <Info label="Amount" value={`₹${booking.amount}`} />
                <Info label="Method" value={booking.paymentMethod} />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Payment Status</p>
                  <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                    booking.paymentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {booking.paymentStatus}
                  </span>
                </div>
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
                {isConfirmed && isPaid ? "Payment is recorded. Use the server-issued invoice number in invoice lookup." : "An invoice is issued after the booking is confirmed and payment is collected."}
              </p>
            </section>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-6">
            {showQr ? <section className="rounded-2xl border bg-white p-6 text-center shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Booking QR</h3>
              <p className="mt-1 text-sm text-slate-500">{isConfirmed ? "Show this QR at check-in" : "Show this QR at check-in once the property approves your booking"}</p>

              <div className="mx-auto mt-5 flex items-center justify-center rounded-2xl border border-slate-100 bg-white p-3 shadow-sm w-fit">
                <QRCodeSVG
                  id="booking-qr-svg"
                  value={qrValue}
                  size={180}
                  level="M"
                  includeMargin
                />
              </div>

              <p className="mt-3 text-xs font-semibold text-brand-600">{booking.bookingCode}</p>

              <button
                onClick={handleDownloadQR}
                className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ⬇ Download QR
              </button>
            </section> : null}

            {/* Status */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Booking Status</h3>
              <div className="mt-5 space-y-4">
                <StatusItem title="Booking Created" description="Booking successfully created" active />
                <StatusItem title="Payment Completed" description="Payment received" active={booking.paymentStatus === "PAID"} />
                <StatusItem
                  title="Booking Confirmed"
                  description="Your bed is reserved"
                  active={["Confirmed", "CONFIRMED", "Checked in"].includes(booking.bookingStatus)}
                />
                <StatusItem
                  title="Checked In"
                  description={booking.bookingStatus === "Checked in" ? "Guest is in-house" : "Pending"}
                  active={booking.bookingStatus === "Checked in"}
                />
              </div>
            </section>

            {/* Cancel */}
            {!["Cancelled", "Completed"].includes(booking.bookingStatus) && (
              <button
                onClick={handleCancel}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 font-semibold text-red-600 hover:bg-red-50"
              >
                Cancel Booking
              </button>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

/* --------------------------------
   Small Components
-------------------------------- */

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function StatusItem({ title, description, active = false }) {
  return (
    <div className="flex gap-3">
      <div className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${active ? "bg-brand-500" : "bg-slate-300"}`} />
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}
