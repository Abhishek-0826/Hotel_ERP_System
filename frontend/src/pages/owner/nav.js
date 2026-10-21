import {
  LayoutDashboard, Building2, BedDouble, CalendarDays, Hotel, Users, Settings,
  ClipboardList, CheckCircle2, Wrench, CreditCard, Receipt, RotateCcw, UserCheck, Package,
  AlertTriangle, Activity, BarChart3, TrendingUp, FileText,
} from "../../components/icons";

// Menu for the OWNER and STAFF roles. It mirrors the route guards in App.jsx:
// items marked `ownerOnly` are reachable by the OWNER role only; `notFor` hides an item from the listed roles
// (the API denies them that permission, so the link would only bounce back to the dashboard).
const allOwnerNav = [
  {
    section: "Workspace",
    items: [
      { label: "Overview", to: "/owner", icon: LayoutDashboard },
      { label: "Properties", to: "/owner/properties", icon: Building2 },
      { label: "Rooms & beds", to: "/owner/rooms", icon: BedDouble },
      { label: "Bookings", to: "/owner/bookings", icon: CalendarDays },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Guests", to: "/guests", icon: Users },
      { label: "New booking", to: "/bookings/new", icon: ClipboardList },
      { label: "Check-in", to: "/check-in", icon: CheckCircle2 },
      { label: "Check-out", to: "/check-out", icon: Wrench },
      { label: "Payments", to: "/payments", icon: CreditCard },
      { label: "Invoices", to: "/invoices", icon: Receipt },
      { label: "Refunds", to: "/refunds", icon: RotateCcw },
    ],
  },
  {
    section: "Management",
    items: [
      { label: "Staff", to: "/staff", icon: UserCheck },
      { label: "Inventory", to: "/inventory", icon: Package, notFor: ["STAFF"] },
      { label: "Complaints", to: "/complaints", icon: AlertTriangle },
      { label: "Feedback", to: "/feedback", icon: Activity },
      { label: "Team & roles", to: "/users", icon: Users, ownerOnly: true },
    ],
  },
  {
    section: "Insights",
    items: [
      { label: "Reports", to: "/reports", icon: BarChart3, notFor: ["STAFF"] },
      { label: "Business intelligence", to: "/bi", icon: TrendingUp, ownerOnly: true },
    ],
  },
  {
    section: "Hotel",
    items: [
      { label: "Hotel profile", to: "/owner/setup", icon: Hotel, ownerOnly: true },
      { label: "Settings", to: "/settings", icon: Settings, ownerOnly: true },
      { label: "Audit logs", to: "/audit-logs", icon: FileText, ownerOnly: true },
    ],
  },
];

export const getOwnerNav = (role) =>
  allOwnerNav
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => (!item.ownerOnly || role === "OWNER") && !item.notFor?.includes(role))
        // Staff use the shared bookings list (read-only); the owner has the full console page.
        .map((item) => (item.to === "/owner/bookings" && role !== "OWNER" ? { ...item, to: "/bookings" } : item)),
    }))
    .filter((group) => group.items.length);

export const ownerNav = getOwnerNav("OWNER");
