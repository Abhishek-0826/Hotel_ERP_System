import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import PropertyCard from "../components/property/PropertyCard";
import { CardSkeleton } from "../components/ui/LoadingState";

import { useApi } from "../hooks/useApi";
import { useAppState } from "../context/AppStateContext";
import { useTenant } from "../context/TenantContext";
import { propertyApi } from "../api/services";
import { getDefaultStayDates, nextDayInput, stayDatesError, todayInput } from "../utils/dates";

// Home page of one hotel (/<slug>). Everything shown here belongs to that hotel only.
export default function TenantHome() {
  const tenant = useTenant();
  const navigate = useNavigate();
  const { favorites, toggleFavorite } = useAppState();
  const defaults = useMemo(getDefaultStayDates, []);
  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);

  const { data: properties, loading } = useApi(
    () => propertyApi.list(),
    [],
    { transform: (d) => (Array.isArray(d) ? d : d.properties || []) },
  );

  const accent = tenant.brandColor || undefined;

  const dateError = stayDatesError(checkIn, checkOut);
  const changeCheckIn = (value) => {
    setCheckIn(value);
    // Keep check-out after check-in.
    if (value && checkOut && checkOut <= value) setCheckOut(nextDayInput(value));
  };

  const search = (event) => {
    event.preventDefault();
    if (dateError) return;
    navigate(`/properties?checkIn=${checkIn}&checkOut=${checkOut}`);
  };

  return (
    <>
      <Navbar />

      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50 to-[#faf8f5]">
        <div className="container-page py-14 text-center sm:py-20">
          {tenant.logoUrl && (
            <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="mx-auto mb-5 h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-sm" />
          )}
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-5xl" style={accent ? { color: accent } : undefined}>
            {tenant.name}
          </h1>
          {tenant.tagline && <p className="mx-auto mt-3 max-w-xl text-lg text-ink-600">{tenant.tagline}</p>}

          <form onSubmit={search} className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl bg-white p-4 shadow-pop sm:flex-row sm:items-end">
            <label className="field flex-1 text-left">
              <span className="label">Check-in</span>
              <input type="date" required className="input" value={checkIn} min={todayInput()} onChange={(e) => changeCheckIn(e.target.value)} />
            </label>
            <label className="field flex-1 text-left">
              <span className="label">Check-out</span>
              <input type="date" required className="input" value={checkOut} min={checkIn ? nextDayInput(checkIn) : todayInput()} onChange={(e) => setCheckOut(e.target.value)} />
            </label>
            <button disabled={Boolean(dateError)} className="btn-primary sm:px-8" style={accent ? { backgroundColor: accent } : undefined}>Find a bed</button>
          </form>
          {dateError && <p role="alert" className="mt-3 text-sm font-medium text-rose-600">{dateError}</p>}
        </div>
      </section>

      <main className="container-page py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold text-ink-900">Our properties</h2>
          <Link to="/properties" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <CardSkeleton key={i} className="h-64" />)}</div>
        ) : properties.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center text-ink-500">
            We're getting our rooms ready. Please check back soon.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} favorite={favorites?.includes?.(property.id)} onFavorite={() => toggleFavorite(property.id)} />
            ))}
          </div>
        )}

        {(tenant.description || tenant.address || tenant.contactPhone || tenant.contactEmail) && (
          <section className="mt-14 grid gap-8 rounded-2xl border border-ink-100 bg-white p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <h2 className="text-xl font-extrabold text-ink-900">About {tenant.name}</h2>
              {tenant.description && <p className="mt-3 whitespace-pre-line text-ink-600">{tenant.description}</p>}
            </div>
            <dl className="space-y-3 text-sm">
              {tenant.address && <div><dt className="label">Address</dt><dd className="font-semibold text-ink-800">{tenant.address}</dd></div>}
              {tenant.contactPhone && <div><dt className="label">Phone</dt><dd className="font-semibold text-ink-800"><a href={`tel:${tenant.contactPhone}`}>{tenant.contactPhone}</a></dd></div>}
              {tenant.contactEmail && <div><dt className="label">Email</dt><dd className="font-semibold text-ink-800"><a href={`mailto:${tenant.contactEmail}`}>{tenant.contactEmail}</a></dd></div>}
              {tenant.website && <div><dt className="label">Website</dt><dd className="font-semibold text-ink-800"><a href={tenant.website} target="_blank" rel="noreferrer">{tenant.website}</a></dd></div>}
            </dl>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
