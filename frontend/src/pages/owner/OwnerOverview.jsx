  import { Link } from "react-router-dom";

  import DashboardLayout from "../../components/layout/DashboardLayout";
  import Badge from "../../components/ui/Badge";
  import ApiNotice from "../../components/ui/ApiNotice";
  import Button from "../../components/ui/Button";

  import { useApi } from "../../hooks/useApi";
  import { useAuth } from "../../context/AuthContext";

  import { analyticsApi, bookingApi, propertyApi } from "../../api/services";

  import {
    demoAnalytics,
    demoBookings,
  } from "../../data/demo/properties";

  import { getOwnerNav } from "./nav";
  import { canManageInventory } from "../../utils/roles";

  import {
    Plus,
    TrendingUp,
  } from "../../components/icons";

// Greeting follows the visitor's local clock.
const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
};

  export default function OwnerOverview() {
    const { user } = useAuth();
    const canManage = canManageInventory(user?.role);

    /* =========================================================
      ANALYTICS
      GET /api/v1/analytics/owner-summary
      ========================================================= */

    const {
      data: analytics,
      error: analyticsError,
    } = useApi(
      () => analyticsApi.ownerSummary(),
      demoAnalytics.owner,
      {}
    );

    /* =========================================================
      PROPERTIES
      GET /api/v1/properties/mine
      ========================================================= */

    const {
      data: propertiesResponse,
      error: propertiesError,
    } = useApi(
      () => propertyApi.mine(),
      [],
      {}
    );

    const properties = Array.isArray(propertiesResponse) ? propertiesResponse : [];

    /* =========================================================
      SAFE ANALYTICS DATA
      ========================================================= */

    const safeAnalytics = analytics || {};

    const {
      data: recentBookings,
      error: bookingsError,
    } = useApi(
      () => bookingApi.ownerList({ pageSize: 5 }),
      demoBookings,
      {}
    );

    const stats = Array.isArray(safeAnalytics?.stats)
      ? safeAnalytics.stats
      : [];

    const occupancy = Array.isArray(safeAnalytics?.occupancy)
      ? safeAnalytics.occupancy
      : [];

    const occupancyLabels = Array.isArray(
      safeAnalytics?.occupancyLabels
    )
      ? safeAnalytics.occupancyLabels
      : [];

    return (
      <DashboardLayout
        nav={getOwnerNav(user?.role)}
        title="Overview"
      >
        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-ink-900">
              {greeting()},{" "}
              {user?.name?.split(" ")[0] || "there"}
            </h1>

            <p className="mt-1 text-sm text-ink-500">
              Here's what's happening across your spaces today.
            </p>
          </div>

          {canManage && (
            <Link to="/owner/properties">
              <Button
                variant="teal"
                size="sm"
              >
                <Plus size={15} />
                Add property
              </Button>
            </Link>
          )}
        </div>

        {/* =====================================================
            API NOTICE
            ===================================================== */}

        <ApiNotice
          message={
            analyticsError ||
            propertiesError ||
            bookingsError
          }
        />

        {/* =====================================================
            MY PROPERTIES
            ===================================================== */}

        <section className="mb-6">

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

            <div>
              <h2 className="text-sm font-bold text-ink-900">
                My Properties
              </h2>

              <p className="mt-1 text-xs text-ink-500">
                Properties connected to your owner account.
              </p>
            </div>

            <Link
              to="/owner/properties"
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              View all
            </Link>

          </div>

          {/* ===================================================
              PROPERTY CARDS
              =================================================== */}

          {properties.length > 0 ? (

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">

              {properties.map((property) => (

                <article
                  key={property.id}
                  className="card p-4 transition-shadow hover:shadow-md"
                >

                  {/* PROPERTY NAME + STATUS */}

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <h3 className="truncate text-sm font-bold text-ink-900">
                        {property.name}
                      </h3>

                      <p className="mt-1 text-xs text-ink-500">

                        {property.city || "—"}

                        {property.state
                          ? `, ${property.state}`
                          : ""}

                      </p>

                    </div>

                    <Badge
                      value={
                        property.status || "DRAFT"
                      }
                    />

                  </div>

                  {/* ADDRESS */}

                  {property.address && (

                    <p className="mt-4 text-xs leading-5 text-ink-500">
                      {property.address}
                    </p>

                  )}

                  {/* PROPERTY DETAILS */}

                  <div className="mt-4 grid grid-cols-2 gap-2">

                    <div className="rounded-lg bg-ink-50 p-2.5">

                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        Property ID
                      </span>

                      <span className="mt-1 block text-xs font-bold text-ink-800">
                        #{property.id}
                      </span>

                    </div>

                    <div className="rounded-lg bg-ink-50 p-2.5">

                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        Tenant
                      </span>

                      <span className="mt-1 block text-xs font-bold text-ink-800">
                        #{property.tenantId}
                      </span>

                    </div>

                  </div>

                  {/* ACTION */}

                  <div className="mt-4 flex items-center justify-between">

                    <span className="truncate text-[10px] font-semibold text-ink-400">
                      {property.slug}
                    </span>

                    <Link
                      to={`/owner/rooms?property=${property.id}`}
                      className="text-xs font-bold text-brand-600 hover:underline"
                    >
                      Manage →
                    </Link>

                  </div>

                </article>

              ))}

            </div>

          ) : (

            /* =================================================
              EMPTY STATE
              ================================================= */

            <div className="card p-8 text-center">

              <div className="mx-auto max-w-sm">

                <h3 className="text-sm font-bold text-ink-900">
                  No properties found
                </h3>

                <p className="mt-1 text-xs leading-5 text-ink-500">
                  {canManage
                    ? "You haven't added any properties yet. Create your first property to start managing rooms, beds and bookings."
                    : "No properties have been set up yet. Please contact the owner."}
                </p>

                {canManage && (
                  <Link
                    to="/owner/properties"
                    className="mt-4 inline-flex"
                  >
                    <Button
                      variant="teal"
                      size="sm"
                    >
                      <Plus size={15} />
                      Add property
                    </Button>
                  </Link>
                )}

              </div>

            </div>

          )}

        </section>

        {/* =====================================================
            ANALYTICS STATS
            ===================================================== */}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">

          {stats.map((stat) => (

            <article
              key={stat.label}
              className="card p-4"
            >

              <small className="text-xs font-semibold text-ink-500">
                {stat.label}
              </small>

              <b className="mt-1 block text-2xl font-extrabold text-ink-900">
                {stat.value}
              </b>

            </article>

          ))}

        </div>

        {/* =====================================================
            DASHBOARD CONTENT
            ===================================================== */}

        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr_1fr]">

          {/* ===================================================
              OCCUPANCY OVERVIEW
              =================================================== */}

          <article className="card p-5">

            <div className="mb-4 flex items-center justify-between">

              <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">

                <TrendingUp
                  size={15}
                  className="text-brand-500"
                />

                Occupancy overview

              </h3>

              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                Live data
              </span>

            </div>

            <div className="flex h-40 items-end gap-3">

              {occupancy.map(
                (number, index) => (

                  <div
                    key={index}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  >

                    <span className="text-[10px] font-bold text-ink-600">{number}%</span>

                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-300"
                        style={{
                          height: `${Math.min(100, Math.max(3, number))}%`,
                        }}
                      />
                    </div>

                    <span className="text-[10px] font-semibold text-ink-400">

                      {occupancyLabels[index] ||
                        `Day ${index + 1}`}

                    </span>

                  </div>

                )
              )}

            </div>

          </article>

          {/* ===================================================
              TODAY'S OCCUPANCY
              =================================================== */}

          <article className="card flex flex-col items-center justify-center p-5 text-center">

            <p className="mb-3 text-sm font-bold text-ink-900">
              Today's occupancy
            </p>

            <OccupancyRing
              value={
                occupancy.length > 0
                  ? occupancy[
                      occupancy.length - 1
                    ]
                  : 0
              }
            />

            <p className="mt-3 text-xs text-ink-500">

              {occupancy.length > 0
                ? occupancy[
                    occupancy.length - 1
                  ]
                : 0}
              % of beds filled

            </p>

          </article>

          {/* ===================================================
              RECENT BOOKINGS
              =================================================== */}

          <article className="card p-5">

            <div className="mb-3 flex items-center justify-between">

              <h3 className="text-sm font-bold text-ink-900">
                Recent bookings
              </h3>

              <Link
                to="/owner/bookings"
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                View all
              </Link>

            </div>

            <div className="flex flex-col divide-y divide-ink-50">

              {recentBookings.length > 0 ? (

                recentBookings.map(
                  (booking) => (

                    <div
                      key={booking.bookingCode || booking.code}
                      className="flex items-center justify-between gap-2 py-2.5"
                    >

                      <div>

                        <b className="text-[13px] text-ink-900">
                          {booking.guestName || booking.guest?.name || "Guest"}
                        </b>

                        <p className="text-[11px] text-ink-500">

                          {booking.bookingCode || booking.code}

                          {" · "}

                          {booking.propertyName || booking.property || "Property"}

                        </p>

                      </div>

                      <Badge
                        value={booking.status}
                      />

                    </div>

                  )
                )

              ) : (

                <p className="py-5 text-center text-xs text-ink-500">
                  No recent bookings
                </p>

              )}

            </div>

          </article>

        </div>

      </DashboardLayout>
    );
  }


  /* =========================================================
    OCCUPANCY RING
    ========================================================= */

  function OccupancyRing({ value }) {

    const radius = 46;

    const circumference =
      2 * Math.PI * radius;

    const safeValue = Math.min(
      100,
      Math.max(
        0,
        Number(value) || 0
      )
    );

    const offset =
      circumference -
      (safeValue / 100) *
        circumference;

    return (

      <svg
        viewBox="0 0 120 120"
        className="h-32 w-32"
      >

        {/* BACKGROUND RING */}

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#eceef2"
          strokeWidth="12"
        />

        {/* PROGRESS RING */}

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#dd6a30"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{
            transition:
              "stroke-dashoffset .6s ease",
          }}
        />

        {/* VALUE */}

        <text
          x="60"
          y="66"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="#14171f"
        >
          {safeValue}%
        </text>

      </svg>

    );
  }
