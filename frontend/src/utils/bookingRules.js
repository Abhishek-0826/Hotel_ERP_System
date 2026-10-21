const REASONS = {
  CONFIRMED: "This booking is already confirmed, so there is nothing left to approve.",
  CHECKED_IN: "The guest has already checked in — this booking is past the approval stage.",
  COMPLETED: "This stay is already completed, so it can't be approved again.",
  CANCELLED: "This booking was cancelled, so it can't be approved.",
  REJECTED: "This booking was rejected, so it can't be approved.",
};

/** Why the Approve button is disabled for a booking status, or null when approval is possible. */
export const approveDisabledReason = (status) => {
  const value = String(status || "PENDING").toUpperCase();
  return value === "PENDING" ? null : (REASONS[value] || `Bookings with status ${value} can't be approved.`);
};
