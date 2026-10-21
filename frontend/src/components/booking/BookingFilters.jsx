import { useEffect, useState } from "react";
import { Search, X } from "../icons";

export const EMPTY_BOOKING_FILTERS = { q: "", status: "", paymentStatus: "", propertyId: "", source: "", from: "", to: "" };

/** Only the filters that are set, ready to send as query params. */
export const bookingFilterParams = (filters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "REJECTED"];
const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID"];
const SOURCES = ["WEB", "WALK_IN", "PHONE"];
const label = (value) => value.replace(/_/g, " ").toLowerCase().replace(/^\w/, (char) => char.toUpperCase());

function Select({ name, value, onChange, options, placeholder }) {
  return (
    <select aria-label={placeholder} value={value} onChange={(event) => onChange(name, event.target.value)} className="input py-2">
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const [id, text] = Array.isArray(option) ? option : [option, label(option)];
        return <option key={id} value={id}>{text}</option>;
      })}
    </select>
  );
}

/** Search + status / payment / property / source / stay-date filters shared by every bookings list. */
export default function BookingFilters({ filters, onChange, properties = [] }) {
  const [query, setQuery] = useState(filters.q);
  useEffect(() => setQuery(filters.q), [filters.q]);

  // Wait for the user to stop typing before querying the server.
  useEffect(() => {
    if (query === filters.q) return undefined;
    const timer = setTimeout(() => onChange({ ...filters, q: query }), 400);
    return () => clearTimeout(timer);
  }, [query, filters, onChange]);

  const set = (name, value) => onChange({ ...filters, [name]: value });
  const active = Object.values(filters).some(Boolean);

  return (
    <div className="card mb-5 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search booking code, guest name, phone or email" className="input py-2 pl-8" />
        </div>
        <Select name="status" value={filters.status} onChange={set} options={BOOKING_STATUSES} placeholder="All statuses" />
        <Select name="paymentStatus" value={filters.paymentStatus} onChange={set} options={PAYMENT_STATUSES} placeholder="All payments" />
        <Select name="propertyId" value={filters.propertyId} onChange={set} options={properties.map((property) => [String(property.id), property.name])} placeholder="All properties" />
        <Select name="source" value={filters.source} onChange={set} options={SOURCES} placeholder="All sources" />
        <label className="field"><span className="label">Stay from</span><input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => set("from", event.target.value)} className="input py-2" /></label>
        <label className="field"><span className="label">Stay until</span><input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => set("to", event.target.value)} className="input py-2" /></label>
      </div>
      {active && (
        <button type="button" onClick={() => onChange(EMPTY_BOOKING_FILTERS)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
          <X size={12} /> Clear all filters
        </button>
      )}
    </div>
  );
}
