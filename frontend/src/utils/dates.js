export function toLocalDateInput(date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

/** Today as yyyy-mm-dd in the user's own timezone. */
export const todayInput = () => toLocalDateInput(new Date());

/** The day after a yyyy-mm-dd date (a stay needs at least one night). */
export function nextDayInput(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return toLocalDateInput(date);
}

/** Returns an error message for an invalid stay range, or null when it is fine. */
export function stayDatesError(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "Select both check-in and check-out dates.";
  if (Number.isNaN(new Date(`${checkIn}T00:00:00`).valueOf()) || Number.isNaN(new Date(`${checkOut}T00:00:00`).valueOf())) return "Enter valid dates.";
  if (checkIn < todayInput()) return "Check-in cannot be in the past.";
  if (checkOut <= checkIn) return "Check-out must be after check-in.";
  return null;
}

export function getDefaultStayDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 1);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 7);
  return { checkIn: toLocalDateInput(checkIn), checkOut: toLocalDateInput(checkOut) };
}
