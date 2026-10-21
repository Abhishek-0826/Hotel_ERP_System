import { Navigate, useNavigate } from "react-router-dom";
import FlowLayout from "../../components/layout/FlowLayout";
import BookingSummary from "../../components/booking/BookingSummary";
import Button from "../../components/ui/Button";
import { useBooking } from "../../context/BookingContext";
import { useAuth } from "../../context/AuthContext";
import { ChevronRight } from "../../components/icons";

export default function GuestDetails() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, setGuestDetails, nights } = useBooking();

  if (!draft.property || !draft.bed || !draft.checkIn || !draft.checkOut) {
    return <Navigate to="/properties" replace />;
  }

  const submit = (event) => {
    event.preventDefault();
    setGuestDetails(Object.fromEntries(new FormData(event.currentTarget)));
    navigate("/booking/review");
  };

  return (
    <FlowLayout step={2}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-extrabold text-ink-900">Guest details</h1>
          <p className="mt-1 text-sm text-ink-500">We use these details only for this reservation and booking updates.</p>
        </div>
        <BookingSummary draft={draft} nights={nights} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field"><span className="label">Full name</span><input required name="name" className="input" defaultValue={user?.name || ""} autoComplete="name" /></label>
          <label className="field"><span className="label">Email address</span><input required type="email" name="email" className="input" defaultValue={user?.email || ""} autoComplete="email" /></label>
          <label className="field sm:col-span-2"><span className="label">Phone number</span><input required name="phone" pattern="[6-9][0-9]{9}" className="input" defaultValue={user?.phone || ""} autoComplete="tel" placeholder="10-digit Indian mobile number" /></label>
        </div>
        <div className="flex justify-end"><Button type="submit">Continue to review <ChevronRight size={16} /></Button></div>
      </form>
    </FlowLayout>
  );
}
