import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import ApiNotice from "../../components/ui/ApiNotice";
import LoadingState from "../../components/ui/LoadingState";

import { useApi } from "../../hooks/useApi";
import { useBooking } from "../../context/BookingContext";
import { propertyApi } from "../../api/services";
import { getDefaultStayDates, stayDatesError } from "../../utils/dates";

import { ChevronRight, MapPin, Snowflake, ShowerHead } from "../../components/icons";

const cls = (...classes) => classes.filter(Boolean).join(" ");

export default function BedAvailability() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { draft, setBed } = useBooking();

  const [selected, setSelected] = useState(null);
  const defaultDates = useMemo(getDefaultStayDates, []);

  /*
   * Dates:
   * 1. URL query params
   * 2. BookingContext
   * 3. Demo defaults
   */
  const requestedCheckIn =
    searchParams.get("checkIn") ||
    draft?.checkIn ||
    defaultDates.checkIn;

  const requestedCheckOut =
    searchParams.get("checkOut") ||
    draft?.checkOut ||
    defaultDates.checkOut;

  // A stale or hand-edited link (past dates, check-out not after check-in) falls back to the defaults.
  const datesValid = !stayDatesError(requestedCheckIn, requestedCheckOut);
  const checkIn = datesValid ? requestedCheckIn : defaultDates.checkIn;
  const checkOut = datesValid ? requestedCheckOut : defaultDates.checkOut;

  /*
   * IMPORTANT:
   * Route is /properties/:slug/availability
   *
   * Therefore we ALWAYS use `slug`.
   */
  const {
    data: availability,
    loading,
    error,
  } = useApi(
    () =>
      propertyApi.availability(slug, {
        checkIn,
        checkOut,
      }),
    null,
    {
      deps: [slug, checkIn, checkOut],

      transform: (response) => {
        if (!response) {
          return null;
        }

        /*
         * Backend response:
         *
         * {
         *   success: true,
         *   data: {
         *      propertyId,
         *      propertyName,
         *      checkIn,
         *      checkOut,
         *      nights,
         *      rooms: [...]
         *   }
         * }
         */

        return response?.data || response;
      },
    }
  );

  /*
   * Flatten backend rooms -> beds
   */
  const beds = useMemo(() => {
    if (!availability?.rooms) {
      return [];
    }

    return availability.rooms.flatMap((room) =>
      (room.beds || []).map((bed) => ({
        id: String(bed.id),

        bedCode: bed.bedCode,

        roomId: String(room.id),

        roomNumber: room.roomNumber,

        genderPolicy: room.genderPolicy,

        hasAc: room.hasAc,

        hasAttachedBathroom: room.hasAttachedBathroom,

        position: bed.position,

        price: Number(bed.effectivePrice || room.basePrice || 0),

        totalForStay: Number(bed.totalForStay || 0),

        status: String(bed.status || "AVAILABLE").toUpperCase(),

        isBookable: Boolean(bed.isBookable),
      }))
    ).filter((bed) => bed.isBookable); // guests only see beds they can actually book
  }, [availability]);

  /*
   * Rooms from backend.
   *
   * We use roomNumber instead of room.name/number.
   */
  const rooms = useMemo(() => {
    if (!availability?.rooms) {
      return [];
    }

    // Hide rooms that have no bookable bed left for these dates.
    return availability.rooms.filter((room) => (room.beds || []).some((bed) => bed.isBookable));
  }, [availability]);

  const nights = Number(availability?.nights || calculateNights(checkIn, checkOut));

  /*
   * Continue to guest details
   */
  const continueBooking = () => {
    if (!selected) {
      return;
    }

    /*
     * Save selected bed into BookingContext.
     */
    setBed(selected);

    navigate(
      `/booking/guest-details?property=${encodeURIComponent(slug)}&bed=${encodeURIComponent(
        selected.bedCode
      )}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <LoadingState label="Loading bed availability..." />
        <Footer />
      </>
    );
  }

  /*
   * If slug is missing, show useful error instead of crashing.
   */
  if (!slug) {
    return (
      <>
        <Navbar />

        <main className="container-page py-12">
          <div className="card p-8 text-center">
            <h1 className="text-xl font-bold text-ink-900">
              Property not found
            </h1>

            <p className="mt-2 text-sm text-ink-500">
              Property slug is missing from the URL.
            </p>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  const propertyName =
    availability?.propertyName ||
    draft?.property?.name ||
    "ROOST Property";

  const availableCount = beds.filter(
    (bed) => bed.status === "AVAILABLE" && bed.isBookable
  ).length;

  return (
    <>
      <Navbar />

      <main className="container-page py-8 pb-32">

        {/* HEADER */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-5">

          <div>
            <p className="flex items-center gap-1 text-xs font-semibold text-ink-400">
              <MapPin size={13} />

              {propertyName}
            </p>

            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900">
              Choose your bed
            </h1>

            <p className="mt-2 text-sm text-ink-500">
              {formatDate(checkIn)} — {formatDate(checkOut)}
              {" · "}
              {nights} {nights === 1 ? "night" : "nights"}
              {" · "}
              1 guest
            </p>
          </div>

          {/* LEGEND */}
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-ink-500">

            <Legend
              color="bg-emerald-500"
              label={`Available (${availableCount})`}
            />

            <Legend
              color="bg-rose-400"
              label="Booked"
            />

            <Legend
              color="bg-ink-300"
              label="Maintenance"
            />
          </div>
        </div>

        <ApiNotice message={error} />

        {/* PROPERTY API ERROR */}
        {!error && !availability && (
          <div className="card p-8 text-center">
            <h2 className="text-lg font-bold text-ink-900">
              Availability unavailable
            </h2>

            <p className="mt-2 text-sm text-ink-500">
              We could not load the beds for this property.
            </p>
          </div>
        )}

        {/* ROOMS */}
        {availability && rooms.length === 0 && (
          <div className="card p-10 text-center">
            <h2 className="text-xl font-bold text-ink-900">
              No rooms available
            </h2>

            <p className="mt-2 text-sm text-ink-500">
              No beds are free for the selected dates. Try different dates.
            </p>
          </div>
        )}

        {rooms.map((room) => {

          const roomBeds = beds.filter(
            (bed) => bed.roomId === String(room.id)
          );

          return (
            <article
              key={room.id}
              className="card mb-5 overflow-hidden"
            >

              {/* ROOM HEADER */}
              <div className="border-b border-ink-100 bg-ink-50 p-5">

                <div className="flex flex-wrap items-start justify-between gap-4">

                  <div>
                    <h2 className="text-lg font-bold text-ink-900">
                      Room {room.roomNumber}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-500">

                      <span>
                        {room.genderPolicy || "MIXED"}
                      </span>

                      {room.hasAc && (
                        <span className="flex items-center gap-1">
                          <Snowflake size={13} />
                          AC
                        </span>
                      )}

                      {room.hasAttachedBathroom && (
                        <span className="flex items-center gap-1">
                          <ShowerHead size={13} />
                          Attached bathroom
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-600">
                    {roomBeds.length}{" "}
                    {roomBeds.length === 1 ? "bed" : "beds"}
                  </span>

                </div>
              </div>

              {/* BEDS */}
              <div className="p-5">

                {roomBeds.length === 0 ? (
                  <div className="rounded-xl bg-ink-50 p-5 text-center text-sm text-ink-500">
                    No beds configured for this room.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

                    {roomBeds.map((bed) => {

                      const available =
                        bed.status === "AVAILABLE" &&
                        bed.isBookable;

                      const booked =
                        bed.status === "BOOKED";

                      const maintenance =
                        bed.status === "MAINTENANCE";

                      const isSelected =
                        selected?.id === bed.id;

                      return (
                        <button
                          key={bed.id}
                          type="button"
                          disabled={!available}
                          onClick={() => setSelected(bed)}
                          className={cls(
                            "rounded-xl border p-4 text-left transition",

                            available &&
                              "cursor-pointer border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:shadow-sm",

                            booked &&
                              "cursor-not-allowed border-rose-100 bg-rose-50 opacity-70",

                            maintenance &&
                              "cursor-not-allowed border-ink-200 bg-ink-100 opacity-70",

                            isSelected &&
                              "ring-2 ring-brand-500 ring-offset-2"
                          )}
                        >

                          <div className="flex items-start justify-between gap-3">

                            <div>
                              <span className="block text-base font-bold text-ink-900">
                                {bed.bedCode}
                              </span>

                              <span className="mt-1 block text-xs uppercase text-ink-500">
                                {bed.position}
                              </span>
                            </div>

                            <StatusBadge status={bed.status} />

                          </div>

                          <div className="mt-4">

                            {available ? (
                              <>
                                <strong className="block text-sm font-bold text-ink-900">
                                  ₹{bed.price.toLocaleString("en-IN")}
                                  <span className="font-medium text-ink-400">
                                    {" "}
                                    / night
                                  </span>
                                </strong>

                                <span className="mt-1 block text-xs text-ink-500">
                                  ₹
                                  {bed.totalForStay.toLocaleString("en-IN")}
                                  {" "}
                                  for {nights} nights
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-semibold text-ink-500">
                                {booked
                                  ? "This bed is already booked"
                                  : "This bed is unavailable"}
                              </span>
                            )}

                          </div>

                        </button>
                      );
                    })}

                  </div>
                )}
              </div>

            </article>
          );
        })}

      </main>

      {/* SELECTED BED DRAWER */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 shadow-lg backdrop-blur">

          <div className="container-page flex flex-wrap items-center justify-between gap-4 py-4">

            <div>
              <p className="text-xs font-semibold text-ink-400">
                SELECTED BED
              </p>

              <p className="mt-1 text-sm text-ink-900">
                <b>{selected.bedCode}</b>
                {" · "}
                {selected.position}
                {" · "}
                {nights} nights
              </p>

              <p className="mt-1 text-xs text-ink-500">
                ₹{selected.price.toLocaleString("en-IN")} / night
                {" · "}
                Total ₹
                {selected.totalForStay.toLocaleString("en-IN")}
              </p>
            </div>

            <button
              type="button"
              onClick={continueBooking}
              className="btn-primary"
            >
              Continue
              <ChevronRight size={16} />
            </button>

          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

/* -------------------------------------------------------
   LEGEND
------------------------------------------------------- */

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-2.5 w-2.5 rounded-full ${color}`}
      />

      {label}
    </span>
  );
}

/* -------------------------------------------------------
   STATUS
------------------------------------------------------- */

function StatusBadge({ status }) {

  if (status === "AVAILABLE") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
        AVAILABLE
      </span>
    );
  }

  if (status === "BOOKED") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">
        BOOKED
      </span>
    );
  }

  return (
    <span className="rounded-full bg-ink-200 px-2 py-1 text-[10px] font-bold text-ink-600">
      {status}
    </span>
  );
}

/* -------------------------------------------------------
   DATE HELPERS
------------------------------------------------------- */

function calculateNights(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);

  const diff = end.getTime() - start.getTime();

  const nights = Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );

  return nights > 0 ? nights : 1;
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
