import {
  Activity, AlertTriangle, BarChart3, BedDouble, CalendarDays, CheckCircle2, ClipboardList, CreditCard, FileText, Heart,
  Home, LayoutDashboard, MessageSquare, Package, Receipt, Settings, Shield, User, UserCheck, Users, Wallet, Wrench,
} from "../components/icons";
import { getOwnerNav } from "../pages/owner/nav";
import { ADMIN_ROLES, GUEST_ROLES, MANAGER_ROLES, OWNER_ROLES, RECEPTIONIST_ROLES, STAFF_ROLES, getRoleHome } from "./roles";

export const guestNav = [
  { section: "My stay", items: [
    { label: "Home", to: "/", icon: Home },
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "My bookings", to: "/my-bookings", icon: CalendarDays },
    { label: "Explore properties", to: "/properties", icon: BedDouble },
    { label: "Payments", to: "/payments", icon: Wallet },
  ] },
  { section: "Account & support", items: [
    { label: "Profile", to: "/profile", icon: User },
    { label: "Feedback", to: "/feedback", icon: Heart },
    { label: "Complaints", to: "/complaints", icon: MessageSquare },
  ] },
];

const FRONT_DESK = [...OWNER_ROLES, ...STAFF_ROLES, ...MANAGER_ROLES, ...RECEPTIONIST_ROLES];

// `roles` mirrors the route guards in App.jsx; items without it are open to every staff-side role.
const staffNav = [
  { section: "Overview", items: [
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Reports", to: "/reports", icon: BarChart3, roles: [...ADMIN_ROLES, ...OWNER_ROLES, ...MANAGER_ROLES] },
  ] },
  { section: "Operations", items: [
    { label: "Guests", to: "/guests", icon: Users, roles: FRONT_DESK },
    { label: "Bookings", to: "/bookings", icon: ClipboardList },
    { label: "Beds", to: "/beds", icon: BedDouble, roles: FRONT_DESK },
    { label: "Check-in", to: "/check-in", icon: CheckCircle2, roles: FRONT_DESK },
    { label: "Check-out", to: "/check-out", icon: Wrench, roles: FRONT_DESK },
    { label: "Payments", to: "/payments", icon: CreditCard },
    { label: "Invoices", to: "/invoices", icon: Receipt, roles: FRONT_DESK },
  ] },
  { section: "Management", items: [
    { label: "Staff", to: "/staff", icon: UserCheck, roles: [...ADMIN_ROLES, ...OWNER_ROLES, ...MANAGER_ROLES] },
    { label: "Inventory", to: "/inventory", icon: Package, roles: [...OWNER_ROLES, ...MANAGER_ROLES] },
    { label: "Complaints", to: "/complaints", icon: AlertTriangle },
    { label: "Feedback", to: "/feedback", icon: Activity },
  ] },
  { section: "System", items: [
    { label: "Settings", to: "/settings", icon: Settings, roles: [...ADMIN_ROLES, "OWNER"] },
    { label: "Access control", to: "/access-control", icon: Shield, roles: ADMIN_ROLES },
    { label: "Audit logs", to: "/audit-logs", icon: FileText, roles: [...ADMIN_ROLES, "OWNER"] },
    { label: "My account", to: "/account", icon: User },
  ] },
];

// The sidebar's Dashboard link points at each role's own home page; items the role cannot open are hidden.
export const navFor = (role) => staffNav
  .map((group) => ({
    ...group,
    items: group.items
      .filter((item) => !item.roles || item.roles.includes(role))
      .map((item) => item.to === "/admin/dashboard" ? { ...item, to: getRoleHome(role) } : item),
  }))
  .filter((group) => group.items.length);

/** Sidebar groups for any signed-in role. */
export const getNavForRole = (role) => {
  if (GUEST_ROLES.includes(role)) return guestNav;
  if (OWNER_ROLES.includes(role) || STAFF_ROLES.includes(role)) {
    const groups = getOwnerNav(role);
    return [...groups, { section: "Account", items: [{ label: "My account", to: "/account", icon: User }] }];
  }
  return navFor(role);
};

/** Where the avatar / "profile" link should go for a role. */
export const getProfilePath = (role) => (GUEST_ROLES.includes(role) ? "/profile" : "/account");
