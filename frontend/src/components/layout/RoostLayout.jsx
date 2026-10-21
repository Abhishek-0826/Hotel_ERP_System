import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAppState } from "../../context/AppStateContext";
import NotificationsPanel from "./NotificationsPanel";
import BackButton from "./BackButton";
import RoleBadge from "./RoleBadge";
import { getProfilePath } from "../../utils/navigation";
import { useTenant } from "../../context/TenantContext";
import { Bell, Menu, X, LogOut, ChevronDown } from "../icons";

/**
 * RoostLayout — extended DashboardLayout with grouped sidebar sections.
 *
 * nav: [{ section, items: [{ label, to, icon }] }]
 *   OR flat array: [{ label, to, icon }]
 */
export default function RoostLayout({ nav = [], title, children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useAppState();
  const navigate = useNavigate();
  const tenant = useTenant();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const navRef = useRef(null);

  // Each page mounts its own layout, so remember the sidebar scroll position between pages.
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return undefined;
    try { el.scrollTop = Number(sessionStorage.getItem("roost_sidebar_scroll")) || 0; } catch { /* storage unavailable */ }
    return () => { try { sessionStorage.setItem("roost_sidebar_scroll", String(el.scrollTop)); } catch { /* storage unavailable */ } };
  }, []);

  // Normalize nav: support both flat arrays and grouped arrays
  const groups = Array.isArray(nav) && nav.length > 0 && nav[0].section !== undefined
    ? nav
    : [{ section: "Menu", items: nav }];

  // Find active label for header
  const activeLabel = groups
    .flatMap((g) => g.items || [])
    .find((item) => pathname === item.to || pathname.startsWith(item.to + "/"))?.label || title;

  const toggleSection = (section) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] md:grid md:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-ink-100 bg-white transition-transform md:sticky md:top-0 md:h-screen md:self-start md:w-auto md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-ink-100 px-5">
          <Link to="/" className="flex items-center gap-2">
            {tenant?.logoUrl
              ? <img src={tenant.logoUrl} alt="" className="h-8 w-8 rounded-xl object-contain" />
              : <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-xs font-black text-white">{(tenant?.name || "ROOST").slice(0, 1)}</span>}
            <span className="text-base font-extrabold text-ink-900 tracking-tight">{tenant?.name || "ROOST"}</span>
          </Link>
          <button className="md:hidden text-ink-400" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav groups */}
        <nav ref={navRef} className="flex-1 overflow-y-auto py-4 scrollbar-thin px-3">
          {groups.map((group) => (
            <div key={group.section} className="mb-4">
              {groups.length > 1 && (
                <button
                  className="mb-1 flex w-full items-center justify-between px-2 py-1"
                  onClick={() => toggleSection(group.section)}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">
                    {group.section}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-ink-300 transition-transform ${collapsed[group.section] ? "-rotate-90" : ""}`}
                  />
                </button>
              )}
              {!collapsed[group.section] && (
                <div className="flex flex-col gap-0.5">
                  {(group.items || []).map(({ label, to, icon: Icon }) => {
                    const isActive = pathname === to || pathname.startsWith(to + "/");
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                          isActive
                            ? "bg-brand-50 text-brand-700"
                            : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                        }`}
                      >
                        {Icon && <Icon size={16} className="flex-shrink-0" />}
                        <span className="truncate">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User + logout */}
        <div className="border-t border-ink-100 p-3">
          <Link to={getProfilePath(user?.role)} onClick={() => setMobileOpen(false)} className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-ink-100">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-ink-900">{user?.name || "User"}</p>
              <p className="truncate text-[10px] text-ink-400">{user?.role || ""}</p>
            </div>
          </Link>
          <button
            onClick={() => { logout(); navigate("/"); }}
            title="Log out"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <main className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-ink-100 bg-white/90 px-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <button className="text-ink-500 md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <BackButton />
            <b className="text-base font-bold text-ink-900">{activeLabel}</b>
          </div>
          <div className="flex items-center gap-3">
            <RoleBadge />
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
            </div>
            <Link to={getProfilePath(user?.role)} title="My profile" aria-label="My profile" className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white hover:bg-brand-600">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
            </Link>
          </div>
        </header>
        <div className="flex-1 p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}
