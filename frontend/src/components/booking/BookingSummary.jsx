export default function BookingSummary({ draft, nights }) {
  const property = draft?.property;
  const bed = draft?.bed;
  const total = bed ? (bed.price || bed.effectivePrice || 300) * nights : null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3.5 text-sm">
      <span>
        <b className="text-ink-900">{property?.name || "Roost Hostel"}</b>
        <br />
        <span className="text-ink-500">{bed?.room || "Room 101"} · Bed {bed?.id || "101-A"}</span>
      </span>
      <span className="text-right">
        <span className="text-ink-500">{draft?.checkIn || "03"} – {draft?.checkOut || "10 Sep"}</span>
        <br />
        <b className="text-ink-900">₹{total ?? 2100}</b>
      </span>
    </div>
  );
}
