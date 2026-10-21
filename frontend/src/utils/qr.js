import { getBasePath } from "../lib/tenantRoute";

/** URL encoded in the booking QR. Scanning it opens the check-in form for that booking. */
export const buildCheckInUrl = (bookingCode) =>
  `${window.location.origin}${getBasePath()}/check-in?code=${encodeURIComponent(bookingCode)}`;

/**
 * Extracts a booking code from whatever a QR contains: the check-in URL, the older
 * JSON payload ({ bookingCode }) or just the code itself.
 */
export const parseBookingCode = (text) => {
  const value = String(text || "").trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const code = url.searchParams.get("code");
    if (code) return code;
  } catch { /* not a URL */ }
  try {
    const parsed = JSON.parse(value);
    if (parsed?.bookingCode) return String(parsed.bookingCode);
  } catch { /* not JSON */ }
  return value.match(/ROOST-[A-Z0-9]{4,12}/i)?.[0].toUpperCase() || null;
};
