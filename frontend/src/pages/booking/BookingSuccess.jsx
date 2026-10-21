import { useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { bookingApi } from "../../api/bookings";
import BookingTicket from "../../components/booking/BookingTicket";
import { Check, Download } from "../../components/icons";
import Brand from "../../components/layout/Navbar";
import { DEMO_MODE } from "../../config/demo";
import { useAuth } from "../../context/AuthContext";
import { useBooking } from "../../context/BookingContext";
import { getRoostData } from "../../data/roostLocal";
import { useApi } from "../../hooks/useApi";
import { readDemoBookings } from "../../utils/demoBookings";
import { buildCheckInUrl } from "../../utils/qr";

export default function BookingSuccess() {
  const { draft, nights } = useBooking();
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get("code");
  const stateBooking = location.state?.booking;

  const localBooking = useMemo(() => {
    if (stateBooking) return stateBooking;
    if (draft.bookingResult) return draft.bookingResult;
    if (!DEMO_MODE || !codeParam) return null;

    const demoBooking = readDemoBookings().find(
      (item) => (item.bookingCode || item.code || item.id) === codeParam
    );
    if (demoBooking) return demoBooking;
    return getRoostData().bookings.find(
      (item) => (item.bookingCode || item.id) === codeParam
    ) || null;
  }, [stateBooking, draft.bookingResult, codeParam]);

  const { data: booking, loading, error } = useApi(
    () => localBooking
      ? Promise.resolve(localBooking)
      : codeParam
        ? bookingApi.get(codeParam)
        : Promise.reject(new Error("Booking code is missing.")),
    DEMO_MODE ? localBooking : null,
    { deps: [codeParam] }
  );

  const bookingCode = booking?.bookingCode || booking?.code || codeParam;
  const status = String(booking?.status || "PENDING").toUpperCase();
  const isConfirmed = ["CONFIRMED", "CHECKED_IN"].includes(status);
  // The QR holds the check-in link: scanning it at the front desk opens the pre-filled check-in form.
  const showQr = !["CANCELLED", "REJECTED", "COMPLETED"].includes(status);
  const qrValue = useMemo(() => (bookingCode ? buildCheckInUrl(bookingCode) : ""), [bookingCode]);

  const downloadQr = () => {
    const svg = document.getElementById("success-qr-svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ROOST-Access-${bookingCode}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-ink-50">Loading booking...</main>;
  }

  if (!booking || !bookingCode) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink-50 px-4">
        <div className="card max-w-lg p-8 text-center">
          <h1 className="text-xl font-bold">Booking unavailable</h1>
          <p className="mt-2 text-sm text-ink-500">{error || "We could not find this booking."}</p>
          <Link className="btn-primary mt-5" to="/properties">Find a stay</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-grid bg-ink-50 px-4 py-10">
      <article className="card w-full max-w-xl p-8 text-center animate-fadeIn">
        <div className="mb-3 flex justify-center"><Brand /></div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <Check size={30} />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-ink-900">
          {isConfirmed ? "Booking confirmed" : "Booking request submitted"}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {isConfirmed
            ? "Your property has confirmed the reservation."
            : "The property will review your request. No payment has been collected yet."}
        </p>

        <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Booking code</p>
          <p className="mt-1 text-xl font-extrabold tracking-wider text-brand-600">{bookingCode}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">Status: {status}</p>
        </div>

        {showQr && (
          <div className="mt-6 flex flex-col items-center">
            <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
              <QRCodeSVG id="success-qr-svg" value={qrValue} size={200} level="M" includeMargin />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink-700">Entry / Check-in Access QR</p>
            <p className="mt-1 max-w-sm text-xs text-ink-400">{isConfirmed ? "Show this QR to the front desk at check-in." : "Show this QR at check-in. It works once the property approves your booking."}</p>
            <button onClick={downloadQr} className="mt-3 flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">
              <Download size={14} /> Download QR Code
            </button>
          </div>
        )}

        <div className="mt-6 text-left">
          <BookingTicket
            draft={{ ...draft, ...booking, bed: booking.bed || draft.bed }}
            nights={booking.nights || nights}
            code={bookingCode}
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={`/booking/${bookingCode}`} className="btn-outline">Booking details</Link>
          {user && <Link to="/my-bookings" className="btn-primary">My bookings</Link>}
          {!user && <Link to="/properties" className="btn-primary">Browse properties</Link>}
        </div>
      </article>
    </main>
  );
}
