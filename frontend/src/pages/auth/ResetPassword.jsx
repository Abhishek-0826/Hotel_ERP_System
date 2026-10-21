import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth";
import { useAppState } from "../../context/AppStateContext";
import { SUPABASE_AUTH, supabase } from "../../lib/supabase";
import { getBasePath } from "../../lib/tenantRoute";
import AuthLayout from "./AuthLayout";
import ErrorState from "../../components/ui/ErrorState";

// Landing page for the link in Supabase's "reset your password" email.
// The Supabase client turns the link into a short-lived recovery session.
export default function ResetPassword() {
  const { pushToast } = useAppState();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(SUPABASE_AUTH);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!SUPABASE_AUTH) return undefined;
    supabase.auth.getSession().then(({ data }) => { setReady(Boolean(data.session)); setChecking(false); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) { setReady(true); setChecking(false); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await authApi.setNewPassword(values.password);
      await authApi.signOut();
      pushToast({ type: "success", title: "Password updated", message: "Sign in with your new password." });
      navigate(getBasePath() ? "/login" : "/platform/login", { replace: true });
    } catch (err) {
      setError(err?.message || "Unable to update your password. Request a new link and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="Use at least 12 characters.">
      {checking ? (
        <p className="text-center text-sm text-ink-500">Verifying your reset link…</p>
      ) : !SUPABASE_AUTH || !ready ? (
        <div className="flex flex-col gap-4">
          <ErrorState message="This reset link is invalid or has expired. Request a new one." />
          <Link className="link-quiet text-center" to={getBasePath() ? "/forgot-password" : "/platform/login"}>{getBasePath() ? "Request a new link" : "Back to sign in"}</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <ErrorState message={error} />}
          <label className="field">
            <span className="label">New password</span>
            <input required name="password" type="password" minLength="12" maxLength="128" autoComplete="new-password" className="input" placeholder="At least 12 characters" />
          </label>
          <label className="field">
            <span className="label">Confirm password</span>
            <input required name="confirmPassword" type="password" minLength="12" maxLength="128" autoComplete="new-password" className="input" placeholder="Re-enter the new password" />
          </label>
          <button disabled={busy} className="btn-primary w-full">{busy ? "Updating..." : "Update password"}</button>
        </form>
      )}
    </AuthLayout>
  );
}
