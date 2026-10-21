export const DEMO_BOOKINGS_STORAGE_KEY = "roost_demo_bookings";

export function readDemoBookings() {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(DEMO_BOOKINGS_STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDemoBooking(booking) {
  if (typeof window === "undefined") return booking;

  const code = booking.bookingCode || booking.code;
  const next = [
    ...readDemoBookings().filter(
      (item) => (item.bookingCode || item.code) !== code
    ),
    booking,
  ];
  window.localStorage.setItem(DEMO_BOOKINGS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("roost-demo-booking-updated"));
  return booking;
}

export function updateDemoBooking(code, patch) {
  if (typeof window === "undefined") return [];

  const next = readDemoBookings().map((item) =>
    (item.bookingCode || item.code) === code ? { ...item, ...patch } : item
  );
  window.localStorage.setItem(DEMO_BOOKINGS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("roost-demo-booking-updated"));
  return next;
}
