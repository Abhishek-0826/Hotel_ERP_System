import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useState } from "react";
import Brand from "../../components/layout/Navbar";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import { useAppState } from "../../context/AppStateContext";
import { useAuth } from "../../context/AuthContext";
import PlatformHotels from "./PlatformHotels";
import ResetPassword from "../auth/ResetPassword";
import { authApi } from "../../api/auth";

// Pages that belong to ROOST itself (not to any hotel): landing page and the super-admin console.

function Landing() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#faf8f5] p-6">
      <div className="max-w-xl text-center">
        <Brand className="mb-6 justify-center text-2xl" />
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Bed &amp; room booking for hotels and hostels</h1>
        <p className="mt-3 text-ink-600">
          Each hotel gets its own booking site, team and dashboard. Guests: use the link your hotel shared with you.
          Hotel owners: sign in with the link from your invitation email.
        </p>
        <Link to="/platform/login" className="mt-8 inline-block text-sm font-semibold text-brand-600 hover:underline">Platform admin sign in</Link>
      </div>
    </main>
  );
}

function PlatformLogin() {
  const { login, user, logout } = useAuth();
  const { pushToast } = useAppState();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user && ["PLATFORM_ADMIN", "ADMIN"].includes(user.role)) return <Navigate to="/platform/hotels" replace />;

  const forgot = async (event) => {
    const email = event.currentTarget.form.elements.email.value;
    if (!email) { setError("Enter your email first."); return; }
    try {
      await authApi.forgotPassword({ emailOrPhone: email });
      pushToast({ type: "success", title: "Check your email", message: "We sent a password reset link if the account exists." });
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login({ ...Object.fromEntries(new FormData(event.currentTarget)), role: "PLATFORM_ADMIN" });
      navigate("/platform/hotels", { replace: true });
    } catch (err) {
      setError(err.message || "Sign in failed");
      pushToast({ type: "error", title: "Sign in failed", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#faf8f5] p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <Brand />
        <div>
          <h1 className="text-xl font-extrabold text-ink-900">Platform admin</h1>
          <p className="text-sm text-ink-500">Manage hotels on ROOST.</p>
        </div>
        {user && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">You are signed in as {user.email}, who is not a platform admin. <button type="button" className="underline" onClick={logout}>Sign out</button></p>}
        {error && <ErrorState message={error} />}
        <label className="field"><span className="label">Email</span><input required name="email" type="email" autoComplete="email" className="input" /></label>
        <label className="field"><span className="label">Password</span><input required name="password" type="password" autoComplete="current-password" className="input" /></label>
        <button disabled={busy} className="btn-primary w-full">{busy ? "Signing in…" : "Sign in"}</button>
        <button type="button" className="w-full text-center text-xs font-semibold text-brand-600 hover:underline" onClick={forgot}>Forgot password?</button>
      </form>
    </main>
  );
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Checking your session…" />;
  if (!user || !["PLATFORM_ADMIN", "ADMIN"].includes(user.role)) return <Navigate to="/platform/login" replace />;
  return children;
}

export default function PlatformApp() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/platform" element={<Navigate to="/platform/hotels" replace />} />
      <Route path="/platform/login" element={<PlatformLogin />} />
      <Route path="/platform/reset-password" element={<ResetPassword />} />
      <Route path="/reset-password" element={<Navigate to="/platform/reset-password" replace />} />
      <Route path="/platform/hotels" element={<RequireAdmin><PlatformHotels /></RequireAdmin>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
