import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "../api/client";
import { SUPABASE_AUTH, supabase } from "../lib/supabase";
import { getTenantSlug } from "../lib/tenantRoute";

const AuthContext = createContext(null);

const normalize = (user) => user
  ? { ...user, role: String(user.role || "GUEST").trim().toUpperCase().replace(/[ -]+/g, "_") }
  : null;

const readStoredUser = () => {
  try {
    return normalize(JSON.parse(localStorage.getItem(USER_STORAGE_KEY)));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(() => SUPABASE_AUTH || Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)));

  const persistUser = useCallback((nextUser) => {
    const normalizedUser = normalize(nextUser);
    if (normalizedUser) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
    else localStorage.removeItem(USER_STORAGE_KEY);
    setUser(normalizedUser);
    return normalizedUser;
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    persistUser(null);
    authApi.signOut().catch(() => {});
  }, [persistUser]);

  useEffect(() => {
    let active = true;
    const loadProfile = () => authApi.me()
      .then((profile) => { if (active) persistUser(profile); })
      .catch((error) => {
        if (!active) return;
        // 403 (e.g. signed in to a different hotel) or a network blip must not sign the user out everywhere.
        if (error?.status === 401) clearSession();
        else persistUser(null);
      })
      .finally(() => { if (active) setLoading(false); });

    if (SUPABASE_AUTH) {
      // Restore the Supabase session (if any), then load the ROOST profile.
      supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        if (data.session) loadProfile();
        else { persistUser(null); setLoading(false); }
      });
      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT" && active) persistUser(null);
        if (event === "PASSWORD_RECOVERY") {
          // The emailed link may land on any page; send the user to the reset form of the right hotel.
          let slug = getTenantSlug() || "";
          try { slug = slug || localStorage.getItem("roost_reset_slug") || ""; } catch { /* storage unavailable */ }
          const target = `${slug ? `/${slug}` : "/platform"}/reset-password`;
          if (!window.location.pathname.endsWith("/reset-password")) window.location.replace(target);
        }
      });
      return () => { active = false; listener.subscription.unsubscribe(); };
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setLoading(false);
      return undefined;
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [clearSession, persistUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      persistUser(null);
      setLoading(false);
    };
    window.addEventListener("roost:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("roost:unauthorized", handleUnauthorized);
  }, [persistUser]);

  const persistSession = useCallback((session) => {
    if (!session?.token || !session?.user) throw new Error("The server returned an invalid authentication response.");
    if (!SUPABASE_AUTH) localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
    return persistUser(session.user);
  }, [persistUser]);

  const login = useCallback(async ({ role, ...credentials }) => {
    const loginMethod = role === "PLATFORM_ADMIN" || role === "ADMIN" ? authApi.adminLogin : authApi.login;
    return persistSession(await loginMethod(credentials));
  }, [persistSession]);

  const register = useCallback(async (details) => {
    const result = await authApi.register(details);
    // With email confirmation on, there is no session until the user confirms.
    if (result?.needsEmailConfirmation) return result;
    return persistSession(result);
  }, [persistSession]);
  const refreshProfile = useCallback(async () => persistUser(await authApi.me()), [persistUser]);
  const updateProfile = useCallback(async (details) => persistUser(await authApi.updateProfile(details)), [persistUser]);
  const logout = useCallback(() => clearSession(), [clearSession]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshProfile, updateProfile, isAuthenticated: Boolean(user) }),
    [user, loading, login, register, logout, refreshProfile, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
