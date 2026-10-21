import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { platformApi } from "../../api/tenant";
import Brand from "../../components/layout/Navbar";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import { useAppState } from "../../context/AppStateContext";
import { useAuth } from "../../context/AuthContext";
import Pagination, { usePagination } from "../../components/ui/Pagination";

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

const randomPassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "x")}!a1`;
};

const DELIVERY_TEXT = {
  INVITE_EMAIL: "An email with a set-password link was sent to the owner.",
  PASSWORD: "Share the login URL, email and temporary password below with the owner. They must choose a new password on first sign-in.",
  EXISTING_LOGIN: "The owner already has a ROOST login. They can sign in, or use “Forgot password” at the hotel URL.",
  SIGNUP: "No service key is configured, so no login was created. Ask the owner to Sign up at the hotel URL with this exact email (they confirm by email); they become the hotel owner automatically.",
};

function CreateHotel({ onCreated, onClose }) {
  const [form, setForm] = useState({ displayName: "", slug: "", ownerName: "", ownerEmail: "", ownerPhone: "", accessMode: "invite", temporaryPassword: "" });
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = Object.fromEntries(Object.entries(form).filter(([key, value]) => value !== "" && (key !== "temporaryPassword" || form.accessMode === "password")));
    try {
      onCreated(await platformApi.createHotel(payload));
    } catch (err) {
      const details = Object.values(err.errors || {}).join(" ");
      setError(`${err.message}${details ? `: ${details}` : ""}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-900/40 p-4">
      <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-pop">
        <h2 className="text-lg font-extrabold">Add a hotel</h2>
        {error && <ErrorState message={error} />}
        <label className="field"><span className="label">Hotel name *</span>
          <input required className="input" value={form.displayName} onChange={(e) => { set("displayName", e.target.value); if (!slugEdited) set("slug", slugify(e.target.value)); }} />
        </label>
        <label className="field"><span className="label">URL address *</span>
          <input required className="input" value={form.slug} onChange={(e) => { setSlugEdited(true); set("slug", slugify(e.target.value)); }} />
          <span className="mt-1 text-xs text-ink-400">{window.location.origin}/<b>{form.slug || "your-hotel"}</b></span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field"><span className="label">Owner name *</span><input required className="input" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} /></label>
          <label className="field"><span className="label">Owner phone</span><input className="input" pattern="[6-9][0-9]{9}" value={form.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} placeholder="10 digits" /></label>
        </div>
        <label className="field"><span className="label">Owner email *</span><input required type="email" className="input" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} /></label>

        <fieldset className="space-y-2 rounded-xl border border-ink-100 p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-ink-400">How does the owner get access?</legend>
          <label className="flex items-start gap-2 text-sm"><input type="radio" checked={form.accessMode === "invite"} onChange={() => set("accessMode", "invite")} className="mt-1" /><span><b>Email invitation</b> – they receive a link and choose their own password.</span></label>
          <label className="flex items-start gap-2 text-sm"><input type="radio" checked={form.accessMode === "password"} onChange={() => { set("accessMode", "password"); if (!form.temporaryPassword) set("temporaryPassword", randomPassword()); }} className="mt-1" /><span><b>Temporary password</b> – you share the login details yourself.</span></label>
          {form.accessMode === "password" && (
            <input className="input font-mono text-xs" value={form.temporaryPassword} minLength="12" onChange={(e) => set("temporaryPassword", e.target.value)} />
          )}
        </fieldset>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button disabled={busy} className="btn-primary">{busy ? "Creating…" : "Create hotel"}</button>
        </div>
      </form>
    </div>
  );
}

function CreatedSummary({ result, onClose }) {
  const copy = (text) => navigator.clipboard?.writeText(text);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4">
      <div className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-6 shadow-pop">
        <h2 className="text-lg font-extrabold">{result.tenant?.name || "Hotel"} is ready</h2>
        <p className="text-sm text-ink-600">{DELIVERY_TEXT[result.delivery]}</p>
        <dl className="space-y-2 rounded-xl bg-ink-50 p-3 text-sm">
          <div><dt className="label">Hotel URL</dt><dd className="break-all font-mono text-xs">{result.loginUrl}</dd></div>
          <div><dt className="label">Owner email</dt><dd className="font-mono text-xs">{result.ownerEmail}</dd></div>
          {result.temporaryPassword && <div><dt className="label">Temporary password (shown once)</dt><dd className="break-all font-mono text-xs">{result.temporaryPassword}</dd></div>}
        </dl>
        <div className="flex justify-end gap-3">
          <button className="btn-outline" onClick={() => copy(`Login: ${result.loginUrl}\nEmail: ${result.ownerEmail}${result.temporaryPassword ? `\nPassword: ${result.temporaryPassword}` : ""}`)}>Copy details</button>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default function PlatformHotels() {
  const { user, logout } = useAuth();
  const { pushToast } = useAppState();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const paging = usePagination(hotels || []);

  const load = useCallback(() => platformApi.listHotels().then(setHotels).catch((err) => setError(err.message)), []);
  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (hotel) => {
    const next = hotel.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (next === "SUSPENDED" && !window.confirm(`Suspend ${hotel.name}? Its site and staff logins stop working immediately.`)) return;
    try {
      await platformApi.updateHotel(hotel.id, { status: next });
      pushToast({ type: "success", title: next === "ACTIVE" ? "Hotel reactivated" : "Hotel suspended", message: hotel.name });
      load();
    } catch (err) {
      pushToast({ type: "error", title: "Update failed", message: err.message });
    }
  };

  const resend = async (hotel, accessMode) => {
    try {
      const body = accessMode === "password" ? { accessMode, temporaryPassword: randomPassword() } : { accessMode };
      setCreated({ ...(await platformApi.ownerAccess(hotel.id, body)), tenant: { name: hotel.name } });
      load();
    } catch (err) {
      pushToast({ type: "error", title: "Could not update owner access", message: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <header className="border-b border-ink-100 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Brand />
          <div className="flex items-center gap-3 text-sm text-ink-500">
            <span className="hidden sm:inline">{user?.email}</span>
            <button className="btn-outline btn-sm" onClick={async () => { await logout(); navigate("/platform/login"); }}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="container-page py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="eyebrow">PLATFORM</p>
            <h1 className="text-2xl font-extrabold text-ink-900">Hotels</h1>
          </div>
          <button className="btn-primary" onClick={() => setCreating(true)}>+ Add hotel</button>
        </div>

        {error && <ErrorState message={error} />}
        {!hotels && !error && <LoadingState label="Loading hotels…" />}

        {hotels && (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                <tr><th className="p-3">Hotel</th><th className="p-3">Owner</th><th className="p-3">Setup</th><th className="p-3">Usage</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {hotels.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-ink-500">No hotels yet. Click “Add hotel”.</td></tr>}
                {paging.pageItems.map((hotel) => {
                  const owner = hotel.owners[0];
                  return (
                    <tr key={hotel.id} className="border-b border-ink-50 align-top">
                      <td className="p-3">
                        <div className="font-bold text-ink-900">{hotel.name}</div>
                        <a className="font-mono text-xs text-brand-600 hover:underline" href={hotel.loginUrl.replace(/\/login$/, "")} target="_blank" rel="noreferrer">/{hotel.slug}</a>
                      </td>
                      <td className="p-3">
                        {owner ? (<><div>{owner.name}</div><div className="text-xs text-ink-500">{owner.email}</div><div className="text-xs text-ink-400">{owner.hasLogin ? (owner.mustChangePassword ? "Temp password" : "Has login") : "No login yet"}</div></>) : "—"}
                      </td>
                      <td className="p-3">{hotel.onboardingCompleted ? "Profile complete" : "Awaiting owner"}</td>
                      <td className="p-3 text-xs text-ink-600">{hotel.counts.properties} properties · {hotel.counts.beds} beds · {hotel.counts.bookings} bookings · {hotel.counts.users} users</td>
                      <td className="p-3"><span className={`badge ${hotel.status === "ACTIVE" ? "" : "bg-rose-50 text-rose-700"}`}>{hotel.status}</span></td>
                      <td className="space-x-2 p-3 text-right">
                        <button className="btn-outline btn-sm" onClick={() => resend(hotel, "invite")}>Re-invite</button>
                        <button className="btn-outline btn-sm" onClick={() => resend(hotel, "password")}>Temp password</button>
                        <button className="btn-outline btn-sm" onClick={() => toggleStatus(hotel)}>{hotel.status === "ACTIVE" ? "Suspend" : "Activate"}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination {...paging} className="px-4 pb-4" />
          </div>
        )}
      </main>

      {creating && <CreateHotel onClose={() => setCreating(false)} onCreated={(result) => { setCreating(false); setCreated(result); load(); }} />}
      {created && <CreatedSummary result={created} onClose={() => setCreated(null)} />}
    </div>
  );
}
