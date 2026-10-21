import { useAuth } from "../../context/AuthContext";

const LABELS = { PLATFORM_ADMIN: "Admin", ADMIN: "Admin", OWNER: "Owner", MANAGER: "Manager", RECEPTIONIST: "Receptionist", STAFF: "Staff", GUEST: "Guest" };

/** Shows the signed-in user's role next to the notification bell. */
export default function RoleBadge() {
  const { user } = useAuth();
  if (!user) return null;
  return <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-200">{LABELS[user.role] || user.role}</span>;
}
