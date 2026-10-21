import { useNavigate } from "react-router-dom";
import { useAppState } from "../../context/AppStateContext";
import { useAuth } from "../../context/AuthContext";
import { GUEST_ROLES, OWNER_ROLES } from "../../utils/roles";

const BOOKING_CODE = /ROOST-[A-Z0-9]{4,12}/;

// Where a notification should take the user when clicked.
const destinationFor = (notification, role) => {
  const code = `${notification.title} ${notification.body}`.match(BOOKING_CODE)?.[0];
  if (GUEST_ROLES.includes(role)) {
    if (notification.type === "PAYMENT_RECEIVED") return "/payments";
    return code ? `/booking/${code}` : "/my-bookings";
  }
  if (notification.type === "PAYMENT_RECEIVED") return "/payments";
  if (notification.type === "BOOKING_CREATED") return OWNER_ROLES.includes(role) ? "/owner/bookings" : "/bookings";
  return code ? `/booking/${code}` : "/bookings";
};

const timeAgo = (value) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (Number.isNaN(seconds)) return "";
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return new Date(value).toLocaleDateString();
};

export default function NotificationsPanel({ onClose }) {
  const { notifications, markNotificationRead, markAllRead } = useAppState();
  const { user } = useAuth();
  const navigate = useNavigate();

  const open = (notification) => {
    if (notification.unread) markNotificationRead(notification.id);
    onClose();
    navigate(destinationFor(notification, user?.role));
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-ink-100 bg-white p-2 shadow-pop">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-bold text-ink-900">Notifications</p>
          <button onClick={markAllRead} className="text-xs font-semibold text-brand-600 hover:underline">Mark all read</button>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink-400">You're all caught up.</p>}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={`flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left hover:bg-ink-50 ${n.unread ? "bg-brand-50/60" : ""}`}
            >
              <div className="flex w-full items-center gap-2">
                {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                <span className="text-[13px] font-semibold text-ink-900">{n.title}</span>
              </div>
              <span className="text-xs text-ink-500">{n.body}</span>
              <span className="text-[11px] text-ink-400">{n.createdAt ? timeAgo(n.createdAt) : n.time}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
