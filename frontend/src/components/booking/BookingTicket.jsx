const formatMoney = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
}).format(Number(value || 0));

export default function BookingTicket({ draft, nights, code }) {
  const property = draft?.property;
  const bed = draft?.bed;
  const unitPrice = Number(draft?.price ?? bed?.price ?? bed?.effectivePrice ?? 0);
  const total = Number(draft?.totalAmount ?? draft?.amount ?? unitPrice * Number(nights || 1));
  const room = draft?.roomName || bed?.roomNumber || bed?.room;
  const bedCode = draft?.bedCode || bed?.bedCode || bed?.id;
  const rows = [
    ["Booking code", code || draft?.bookingCode || "—"],
    ["Property", draft?.propertyName || property?.name || "—"],
    ["Room & bed", [room, bedCode].filter(Boolean).join(" · ") || "—"],
    ["Check-in", draft?.checkIn || "—"],
    ["Check-out", draft?.checkOut || "—"],
    ["Total", formatMoney(total)],
  ];

  return (
    <div className="mb-6 divide-y divide-dashed divide-ink-200 rounded-xl border border-ink-100 bg-white px-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
          <span className="text-ink-500">{label}</span>
          <b className="text-right text-ink-900">{value}</b>
        </div>
      ))}
    </div>
  );
}
