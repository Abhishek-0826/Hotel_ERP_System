import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Menu, X, Bell, User, LayoutDashboard, LogOut } from "../icons";
import NotificationsPanel from "./NotificationsPanel";
import { useTenant } from "../../context/TenantContext";
import { getRoleHome } from "../../utils/roles";
import { getProfilePath } from "../../utils/navigation";
import { useAppState } from "../../context/AppStateContext";
import { useInShell } from "./shellContext";
import BackButton from "./BackButton";
import RoleBadge from "./RoleBadge";

// Shows the hotel's logo and name on hotel pages, ROOST on platform pages.
export default function Brand({ className = "" }) {
  const tenant = useTenant();
  return (
    <Link to="/" className={`inline-flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-ink-900 ${className}`}>
      {tenant?.logoUrl
        ? <img src={tenant.logoUrl} alt="" className="h-8 w-8 rounded-lg bg-white object-contain" />
        : <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-white">⌂</span>}
      {tenant ? tenant.name : "ROOST"}
    </Link>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { unreadCount } = useAppState();
  const inShell = useInShell();
  const dashboardPath = getRoleHome(user?.role);
  if (inShell) return null;

  return (
    <nav className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <div className="flex items-center gap-1">
          {pathname !== "/" && <BackButton className="-ml-2" />}
          <Brand />
        </div>
        <div className="hidden items-center gap-7 text-sm font-semibold text-ink-600 md:flex">
          <Link to="/" className="hover:text-brand-600">Home</Link>
          <Link to="/properties" className="hover:text-brand-600">Find a bed</Link>
          <Link to="/gallery" className="hover:text-brand-600">Gallery</Link>
          <Link to="/contact" className="hover:text-brand-600">Contact</Link>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {user && <RoleBadge />}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>}
                </button>
                {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
              </div>
              <Link to={dashboardPath} className="btn-outline btn-sm hidden sm:inline-flex">
                <LayoutDashboard size={14} /> Console
              </Link>
              <Link
                to={getProfilePath(user.role)}
                className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white hover:bg-brand-600"
                title="My profile"
                aria-label="My profile"
              >
                {user.name ? user.name.slice(0, 1).toUpperCase() : <User size={15} />}
              </Link>
              <button
                onClick={() => { logout(); nav("/"); }}
                className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-outline btn-sm">Sign in</Link>
              <Link to="/register" className="btn-primary btn-sm hidden sm:inline-flex">Sign up</Link>
            </>
          )}
          <button className="grid h-9 w-9 place-items-center rounded-lg text-ink-600 hover:bg-ink-100 md:hidden" onClick={() => setOpen((v) => !v)}>
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2 text-sm font-semibold text-ink-700">
            <Link to="/" onClick={() => setOpen(false)}>Home</Link>
            <Link to="/properties" onClick={() => setOpen(false)}>Find a bed</Link>
            <Link to="/gallery" onClick={() => setOpen(false)}>Gallery</Link>
            <Link to="/contact" onClick={() => setOpen(false)}>Contact</Link>
            {user && <Link to={dashboardPath} onClick={() => setOpen(false)}>Console</Link>}
          </div>
        </div>
      )}
    </nav>
  );
}
