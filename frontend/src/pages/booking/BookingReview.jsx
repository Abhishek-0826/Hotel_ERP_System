import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FlowLayout from "../../components/layout/FlowLayout";
import BookingSummary from "../../components/booking/BookingSummary";
import BookingTicket from "../../components/booking/BookingTicket";
import Button from "../../components/ui/Button";
import { useBooking } from "../../context/BookingContext";
import { useAppState } from "../../context/AppStateContext";
import { bookingApi } from "../../api/services";

export default function BookingReview() {
  const navigate = useNavigate();
  const { draft, nights, setBookingResult } = useBooking();
  const { pushToast } = useAppState();
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const baseBooking = {
      propertyName: draft.property?.name || "ROOST Property",
      roomName: draft.bed?.roomNumber ? `Room ${draft.bed.roomNumber}` : draft.bed?.room || "Room",
      bedCode: draft.bed?.bedCode || draft.bed?.id || "BED",
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      guest: draft.guestDetails,
      price: Number(draft.bed?.price || 0),
      nights,
      status: "PENDING",
    };

    try {
      const res = await bookingApi.create({
        propertyId: draft.property?.id,
        roomId: draft.bed?.roomId,
        bedId: draft.bed?.id,
        checkIn: draft.checkIn,
        checkOut: draft.checkOut,
        guestName: draft.guestDetails?.name,
        guestEmail: draft.guestDetails?.email,
        guestPhone: draft.guestDetails?.phone,
        source: "WEB",
      });
      const backendBooking = res || {};
      const bookingCode = backendBooking.bookingCode;
      if (!bookingCode) throw new Error("The booking response did not include a booking code.");
      const booking = {
        ...baseBooking,
        ...backendBooking,
        ...(backendBooking.booking || {}),
        code: bookingCode,
        bookingCode,
        status: backendBooking.status || "PENDING",
      };
      setBookingResult(booking);
      navigate(`/booking/success?code=${encodeURIComponent(bookingCode)}`, { state: { booking } });
    } catch (error) {
      pushToast({ type: "error", title: "Booking could not be created", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlowLayout step={3}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-extrabold text-ink-900">Review your booking</h1>
          <p className="mt-1 text-sm text-ink-500">One last look before we reserve your bed.</p>
        </div>
        <BookingSummary draft={draft} nights={nights} />
        <BookingTicket draft={draft} nights={nights} />
        <label className="flex items-start gap-2.5 text-sm text-ink-600">
          <input required type="checkbox" className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500" />
          I agree to the house rules and cancellation policy.
        </label>
        <div className="flex justify-end">
          <Button type="submit" loading={busy}>{busy ? "Creating booking..." : "Submit booking request"}</Button>
        </div>
      </form>
    </FlowLayout>
  );
}
