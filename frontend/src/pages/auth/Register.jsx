import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAppState } from "../../context/AppStateContext";
import AuthLayout from "./AuthLayout";
import ErrorState from "../../components/ui/ErrorState";
import Button from "../../components/ui/Button";

export default function Register() {
  const { register } = useAuth();
  const { pushToast } = useAppState();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await register(values);
      if (result?.needsEmailConfirmation) {
        pushToast({ type: "success", title: "Check your email", message: "Click the confirmation link we sent, then sign in." });
        navigate("/login", { replace: true });
        return;
      }
      pushToast({ type: "success", title: "Account created", message: "Welcome to ROOST!" });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.message || "Unable to create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create your ROOST account" subtitle="Start finding a better way to stay.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <ErrorState message={error} />}

        <label className="field">
          <span className="label">Full name</span>
          <input required name="name" minLength={2} maxLength={100} pattern=".*\S.*" title="Enter your full name" className="input" placeholder="Your full name" />
        </label>
        <label className="field">
          <span className="label">Email address</span>
          <input required name="email" type="email" className="input" placeholder="you@example.com" />
        </label>
        <label className="field">
          <span className="label">Phone number</span>
          <input name="phone" className="input" placeholder="10-digit Indian number" pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" />
        </label>
        <label className="field">
          <span className="label">Password</span>
          <input required name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" className="input" placeholder="At least 12 characters" />
        </label>

        <Button type="submit" loading={busy} className="justify-center">{busy ? "Creating account…" : "Create account"}</Button>
        <p className="text-center text-sm text-ink-500">
          Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
