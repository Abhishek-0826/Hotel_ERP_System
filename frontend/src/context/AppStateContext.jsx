import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { demoNotifications } from "../data/demo/properties";
import { DEMO_MODE } from "../config/demo";
import { notificationApi } from "../api/notifications";
import { useAuth } from "./AuthContext";

const AppStateContext = createContext(null);

/**
 * Small app-wide UI state: favorites, notifications and toasts. Kept in one
 * provider so any screen can read/update them without prop-drilling.
 */
export function AppStateProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("roost_favorites") || "[]");
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState(DEMO_MODE ? demoNotifications : []);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    localStorage.setItem("roost_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((slug) => {
    setFavorites((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (DEMO_MODE || !userId) return;
    try {
      const items = await notificationApi.list();
      setNotifications(items.map((item) => ({ ...item, time: new Date(item.createdAt).toLocaleString() })));
    } catch {
      // The bell simply keeps its last known state when the API is unreachable.
    }
  }, [userId]);

  // Load the signed-in user's notifications and keep them fresh while the app is open.
  useEffect(() => {
    if (DEMO_MODE) return undefined;
    if (!userId) { setNotifications([]); return undefined; }
    refreshNotifications();
    const timer = setInterval(refreshNotifications, 60000);
    return () => clearInterval(timer);
  }, [userId, refreshNotifications]);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    if (!DEMO_MODE) notificationApi.markRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (!DEMO_MODE) notificationApi.markAllRead().catch(() => {});
  }, []);

  const pushToast = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type: "info", ...toast }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 8000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const value = useMemo(
    () => ({ favorites, toggleFavorite, notifications, unreadCount, markNotificationRead, markAllRead, refreshNotifications, toasts, pushToast, dismissToast }),
    [favorites, notifications, unreadCount, toasts, toggleFavorite, markNotificationRead, markAllRead, refreshNotifications, pushToast, dismissToast]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export const useAppState = () => useContext(AppStateContext);
