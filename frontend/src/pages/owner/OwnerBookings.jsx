import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import ManageTable from "../../components/owner/ManageTable";
import BookingFilters, { EMPTY_BOOKING_FILTERS, bookingFilterParams } from "../../components/booking/BookingFilters";
import { useApi } from "../../hooks/useApi";
import { useAppState } from "../../context/AppStateContext";
import { bookingApi, propertyApi } from "../../api/services";
import { getApiErrorMessage } from "../../api/client";
import { DEMO_MODE } from "../../config/demo";
import { demoBookings } from "../../data/demo/properties";
import { readDemoBookings, updateDemoBooking } from "../../utils/demoBookings";
import { approveDisabledReason } from "../../utils/bookingRules";
import { useAuth } from "../../context/AuthContext";
import { getOwnerNav } from "./nav";

const shortDate = (value) => (value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "");
const codeOf = (booking) => booking.code || booking.bookingCode;

export default function OwnerBookings() {
  const { pushToast } = useAppState();
  const { user } = useAuth();
  const [filters, setFilters] = useState(EMPTY_BOOKING_FILTERS);
  const { data: properties } = useApi(() => propertyApi.mine(), []);

  const getDemoBookings = () => {
    const merged = new Map();
    [...demoBookings, ...readDemoBookings()].forEach((booking) => merged.set(codeOf(booking), booking));
    return [...merged.values()];
  };

  const { data: bookings, loading, error, reload, setData } = useApi(
    () => (DEMO_MODE ? Promise.resolve(getDemoBookings()) : bookingApi.ownerListAll(bookingFilterParams(filters))),
    DEMO_MODE ? demoBookings : [],
    {
      deps: [filters],
      transform: (d) => {
        const value = d?.data?.bookings || d?.data || d?.bookings || d;
        return Array.isArray(value) ? value : [];
      },
    }
  );

  useEffect(() => {
    if (!DEMO_MODE) return undefined;
    const refresh = () => reload();
    window.addEventListener("roost-demo-booking-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("roost-demo-booking-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [reload]);

  const rows = useMemo(
    () => bookings.map((b) => ({
      id: codeOf(b),
      cols: [
        codeOf(b),
        b.guest?.name || b.guestName || b.guest || "Guest",
        b.property || b.propertyName || "Property",
        b.dates || `${shortDate(b.checkIn)} – ${shortDate(b.checkOut)}`,
        String(b.paymentStatus || "UNPAID").replace("_", " "),
        b.status || "PENDING",
      ],
      raw: b,
    })),
    [bookings]
  );

  const approve = async (row) => {
    const bookingCode = codeOf(row.raw);
    try {
      if (DEMO_MODE) {
        updateDemoBooking(bookingCode, { status: "CONFIRMED" });
        setData((prev) => prev.map((booking) => (codeOf(booking) === bookingCode ? { ...booking, status: "CONFIRMED" } : booking)));
      } else {
        const res = await bookingApi.update(bookingCode, "approve");
        setData((prev) => prev.map((b) => (codeOf(b) === bookingCode ? { ...b, status: res?.status || res?.booking?.status || "CONFIRMED" } : b)));
      }
      pushToast({ type: "success", title: "Booking approved", message: `${bookingCode} confirmed successfully.` });
    } catch (err) {
      pushToast({ type: "error", title: "Approval failed", message: getApiErrorMessage(err, "Unable to approve booking.") });
    }
  };

  const changeFilters = useCallback((next) => setFilters(next), []);

  return (
    <DashboardLayout nav={getOwnerNav(user?.role)} title="Bookings">
      <BookingFilters filters={filters} onChange={changeFilters} properties={properties} />
      <ManageTable
        title="All bookings"
        subtitle={`Review, confirm and manage bookings across your properties. ${loading ? "" : `${rows.length} found.`}`}
        headers={["Booking", "Guest", "Property", "Stay", "Payment", "Status"]}
        rows={rows}
        loading={loading}
        error={error}
        statusColumnIndex={5}
        onView={approve}
        viewLabel="Approve"
        viewDisabledReason={(row) => approveDisabledReason(row.raw.status)}
        emptyTitle="No bookings match these filters"
        hideSearch
      />
    </DashboardLayout>
  );
}
