import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "../../components/icons";
import { useAuth } from "../../context/AuthContext";
import { useAppState } from "../../context/AppStateContext";
import { getRoleHome } from "../../utils/roles";
import AuthLayout from "./AuthLayout";
import { useTenant } from "../../context/TenantContext";

const roles = [["GUEST", "Guest"], ["OWNER", "Owner"], ["MANAGER", "Manager"], ["RECEPTIONIST", "Reception"], ["STAFF", "Staff"]];

export default function Login() {
  const { login } = useAuth();
  const { pushToast } = useAppState();
  const tenant = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("GUEST");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const user = await login({ ...Object.fromEntries(new FormData(event.currentTarget)), role });
      pushToast({ type: "success", title: `Welcome to ${tenant?.name || "ROOST"}`, message: `Signed in as ${user.role.toLowerCase().replace("_", " ")}.` });
      if (["PLATFORM_ADMIN", "ADMIN"].includes(user.role)) { window.location.assign("/platform/hotels"); return; }
      const destination = location.state?.from || getRoleHome(user.role);
      navigate(destination, { replace: true });
    } catch (error) {
      pushToast({ type: "error", title: "Sign in failed", message: error.message });
    } finally {
      setBusy(false);
    }
  };
  return <AuthLayout title={`Welcome to ${tenant?.name || "ROOST"}`} subtitle="Sign in to book a bed or manage the property.">
    <form onSubmit={submit} className="flex flex-col gap-4">
      {location.state?.notice && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{location.state.notice}</p>}
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-ink-100 p-1">{roles.map(([value, label]) => <button key={value} type="button" onClick={() => setRole(value)} className={`rounded-md px-2 py-2 text-xs font-bold ${role === value ? "bg-white text-brand-600 shadow-sm" : "text-ink-500"}`}>{label}</button>)}</div>
      <label className="field"><span className="label">Email address</span><input required name="email" type="email" autoComplete="email" className="input" placeholder="you@example.com" /></label>
      <label className="field"><span className="label">Password</span><span className="relative"><input required name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="input pr-10" placeholder="Enter password" /><button aria-label={showPassword ? "Hide password" : "Show password"} type="button" onClick={() => setShowPassword((shown) => !shown)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
      <Link to="/forgot-password" className="-mt-1 text-right text-xs font-semibold text-brand-600 hover:underline">Forgot password?</Link>
      <button disabled={busy} className="btn-primary w-full">{busy ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-sm text-ink-500">Need a guest account? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Sign up</Link></p>
    </form>
  </AuthLayout>;
}
