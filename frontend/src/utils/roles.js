export const GUEST_ROLES = ["GUEST"];

export const OWNER_ROLES = ["OWNER"];
export const STAFF_ROLES = ["STAFF"];

// ADMIN is retained temporarily for compatibility with existing accounts.
// New backend tokens should use PLATFORM_ADMIN.
export const ADMIN_ROLES = ["PLATFORM_ADMIN", "ADMIN"];

// New hostel-management roles
export const MANAGER_ROLES = ["MANAGER"];
export const RECEPTIONIST_ROLES = ["RECEPTIONIST"];

// All authenticated roles combined
export const ALL_ROLES = [
  ...GUEST_ROLES,
  ...OWNER_ROLES,
  ...STAFF_ROLES,
  ...ADMIN_ROLES,
  ...MANAGER_ROLES,
  ...RECEPTIONIST_ROLES,
];

// Only the owner (and platform admin) may create/edit/delete properties, rooms and beds.
// STAFF, MANAGER and RECEPTIONIST have read-only access to them (enforced by the API too).
export const canManageInventory = (role) => role === "OWNER" || ADMIN_ROLES.includes(role);

export function getRoleHome(role) {
  const normalizedRole = String(role || "GUEST")
    .trim()
    .toUpperCase()
    .replace(/[ -]+/g, "_");

  // The platform admin works in the /platform console, outside any hotel.
  if (ADMIN_ROLES.includes(normalizedRole)) return "/";
  if (MANAGER_ROLES.includes(normalizedRole)) return "/manager/dashboard";
  if (RECEPTIONIST_ROLES.includes(normalizedRole)) return "/reception/dashboard";
  if (STAFF_ROLES.includes(normalizedRole)) return "/staff/dashboard";
  if (OWNER_ROLES.includes(normalizedRole)) return "/owner";

  return "/dashboard";
}
