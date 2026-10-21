import { apiRequest } from "./client";
import { SUPABASE_AUTH, supabase } from "../lib/supabase";
import { getBasePath, getTenantSlug } from "../lib/tenantRoute";

const legacy = {
  login: (credentials) => apiRequest({ method: "post", url: "/auth/login", data: credentials }),
  adminLogin: (credentials) => apiRequest({ method: "post", url: "/auth/admin/login", data: credentials }),
  register: (details) => apiRequest({ method: "post", url: "/auth/register", data: details }),
  changePassword: (details) => apiRequest({ method: "post", url: "/auth/change-password", data: details }),
  forgotPassword: (details) => apiRequest({ method: "post", url: "/auth/forgot-password", data: details }),
};

const me = () => apiRequest({ method: "get", url: "/auth/me" });
// Clears the "must change password" flag once the user has chosen their own password.
const passwordUpdated = () => apiRequest({ method: "post", url: "/auth/password-updated" });

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// Signs in with Supabase, then loads the ROOST profile (role/tenant) from the API.
const supabaseSignIn = async ({ email, password }) => {
  const { session } = unwrap(await supabase.auth.signInWithPassword({ email, password }));
  try {
    return { token: session.access_token, user: await me() };
  } catch (error) {
    await supabase.auth.signOut();
    throw error;
  }
};

const supabaseApi = {
  login: supabaseSignIn,
  adminLogin: async (credentials) => {
    const session = await supabaseSignIn(credentials);
    if (!["PLATFORM_ADMIN", "ADMIN"].includes(session.user.role)) {
      await supabase.auth.signOut();
      throw new Error("Invalid admin email or password");
    }
    return session;
  },
  register: async ({ name, email, phone, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone: phone || undefined }, emailRedirectTo: `${window.location.origin}${getBasePath()}/login` },
    });
    if (error) {
      // Supabase's built-in mailer is capped at a few emails per hour.
      if (error.code === "over_email_send_rate_limit" || /rate limit/i.test(error.message)) {
        throw new Error("Too many sign-up emails were sent recently. Please wait about an hour and try again, or contact support.");
      }
      throw new Error(error.message);
    }
    const { session } = data;
    // No session means "Confirm email" is on: the user must click the emailed link first.
    if (!session) return { needsEmailConfirmation: true };
    return { token: session.access_token, user: await me() };
  },
  forgotPassword: async ({ emailOrPhone }) => {
    const email = String(emailOrPhone || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter the email address of your account.");
    try { localStorage.setItem("roost_reset_slug", getTenantSlug() || ""); } catch { /* storage unavailable */ }
    unwrap(await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${getBasePath() || "/platform"}/reset-password` }));
    return { message: "If an account exists, a reset link has been sent" };
  },
  changePassword: async ({ oldPassword, newPassword }) => {
    const { session } = unwrap(await supabase.auth.getSession());
    if (!session?.user?.email) throw new Error("Please sign in again.");
    const { error } = await supabase.auth.signInWithPassword({ email: session.user.email, password: oldPassword });
    if (error) throw new Error("Old password is incorrect");
    unwrap(await supabase.auth.updateUser({ password: newPassword }));
    await passwordUpdated();
    return { message: "Password changed successfully" };
  },
};

export const authApi = {
  ...(SUPABASE_AUTH ? supabaseApi : legacy),
  me,
  updateProfile: (details) => apiRequest({ method: "patch", url: "/auth/me", data: details }),
  // Used by the /reset-password page after following the emailed link.
  setNewPassword: async (password) => {
    unwrap(await supabase.auth.updateUser({ password }));
    await passwordUpdated().catch(() => {});
  },
  changeOwnPassword: async (password) => {
    unwrap(await supabase.auth.updateUser({ password }));
    await passwordUpdated();
  },
  signOut: async () => { if (SUPABASE_AUTH) await supabase.auth.signOut(); },
};
