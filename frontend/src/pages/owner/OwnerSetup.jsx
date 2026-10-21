import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth";
import { tenantApi } from "../../api/tenant";
import Brand from "../../components/layout/Navbar";
import ErrorState from "../../components/ui/ErrorState";
import LoadingState from "../../components/ui/LoadingState";
import { useAppState } from "../../context/AppStateContext";
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";

const LOGO_MAX_SIDE = 512;

// Shrinks the chosen image to a small PNG so uploads stay well under the API limit.
const prepareLogo = (file) => new Promise((resolve, reject) => {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    reject(new Error("Please choose a PNG, JPEG or WebP image."));
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const dataUrl = canvas.toDataURL("image/png");
    resolve({ contentType: "image/png", dataBase64: dataUrl.split(",")[1], preview: dataUrl });
  };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file could not be read as an image.")); };
  image.src = url;
});

function PasswordStep({ onDone }) {
  const { pushToast } = useAppState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.password !== values.confirmPassword) { setError("Passwords do not match."); return; }
    setBusy(true);
    setError("");
    try {
      await authApi.changeOwnPassword(values.password);
      pushToast({ type: "success", title: "Password updated", message: "Now tell us about your hotel." });
      await onDone();
    } catch (err) {
      setError(err.message || "Unable to update the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card mx-auto flex max-w-md flex-col gap-4 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-ink-900">Choose your own password</h2>
        <p className="mt-1 text-sm text-ink-500">You signed in with a temporary password. Set a new one (12+ characters) to continue.</p>
      </div>
      {error && <ErrorState message={error} />}
      <label className="field"><span className="label">New password</span><input required name="password" type="password" minLength="12" autoComplete="new-password" className="input" /></label>
      <label className="field"><span className="label">Confirm password</span><input required name="confirmPassword" type="password" minLength="12" autoComplete="new-password" className="input" /></label>
      <button disabled={busy} className="btn-primary">{busy ? "Updating…" : "Update password"}</button>
    </form>
  );
}

export default function OwnerSetup() {
  const { user, refreshProfile } = useAuth();
  const publicTenant = useTenant();
  const { pushToast } = useAppState();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [hotel, setHotel] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [pendingLogo, setPendingLogo] = useState(null);

  const firstTime = user?.tenant && !user.tenant.onboardingCompleted;

  useEffect(() => {
    tenantApi.mine().then((data) => { setHotel(data); setLogoPreview(data.logoUrl); }).catch((err) => setError(err.message));
  }, []);

  const chooseLogo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const prepared = await prepareLogo(file);
      setPendingLogo(prepared);
      setLogoPreview(prepared.preview);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    // Empty optional fields are left out so they do not fail validation.
    const values = Object.fromEntries([...new FormData(event.currentTarget)].filter(([, value]) => value !== ""));
    try {
      if (pendingLogo) await tenantApi.uploadLogo({ contentType: pendingLogo.contentType, dataBase64: pendingLogo.dataBase64 });
      await tenantApi.update({ ...values, completeOnboarding: true });
      await Promise.all([refreshProfile(), publicTenant?.refresh?.()]);
      pushToast({ type: "success", title: firstTime ? "Your hotel is ready" : "Hotel profile saved", message: "Next, add your rooms, beds and team." });
      navigate("/owner", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to save the hotel profile.");
    } finally {
      setBusy(false);
    }
  };

  if (user?.mustChangePassword) {
    return (
      <Shell>
        <PasswordStep onDone={refreshProfile} />
      </Shell>
    );
  }

  if (!hotel) return <Shell>{error ? <ErrorState message={error} /> : <LoadingState label="Loading your hotel…" />}</Shell>;

  return (
    <Shell>
      <form onSubmit={save} className="card mx-auto flex max-w-3xl flex-col gap-5 p-6">
        <div>
          <p className="eyebrow">{firstTime ? "WELCOME — STEP 1 OF 1" : "HOTEL PROFILE"}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{firstTime ? "Tell us about your hotel" : "Hotel profile"}</h1>
          <p className="mt-1 text-sm text-ink-500">This is what guests see on your page, <b>/{hotel.slug}</b>.</p>
        </div>

        {error && <ErrorState message={error} />}

        <div className="flex items-center gap-4">
          {logoPreview
            ? <img src={logoPreview} alt="Logo preview" className="h-20 w-20 rounded-2xl border border-ink-100 bg-white object-contain p-1" />
            : <div className="grid h-20 w-20 place-items-center rounded-2xl border border-dashed border-ink-200 text-xs text-ink-400">No logo</div>}
          <div>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={chooseLogo} />
            <button type="button" className="btn-outline btn-sm" onClick={() => fileInput.current?.click()}>{logoPreview ? "Change logo" : "Upload logo"}</button>
            <p className="mt-1 text-xs text-ink-400">PNG, JPEG or WebP. Resized automatically.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field"><span className="label">Hotel name *</span><input required name="displayName" minLength="2" maxLength="255" className="input" defaultValue={hotel.name} /></label>
          <label className="field"><span className="label">Legal / company name</span><input name="legalName" className="input" defaultValue={hotel.legalName} /></label>
          <label className="field sm:col-span-2"><span className="label">Tagline</span><input name="tagline" maxLength="255" className="input" defaultValue={hotel.tagline || ""} placeholder="Comfortable beds, friendly people" /></label>
          <label className="field sm:col-span-2"><span className="label">About your hotel</span><textarea name="description" rows="3" maxLength="2000" className="input" defaultValue={hotel.description || ""} /></label>
          <label className="field"><span className="label">Contact phone *</span><input required name="contactPhone" pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" className="input" defaultValue={hotel.contactPhone || ""} placeholder="9876543210" /></label>
          <label className="field"><span className="label">Contact email</span><input name="contactEmail" type="email" className="input" defaultValue={hotel.contactEmail || ""} /></label>
          <label className="field sm:col-span-2"><span className="label">Street address *</span><input required name="address" maxLength="255" className="input" defaultValue={hotel.addressLine || ""} /></label>
          <label className="field"><span className="label">City *</span><input required name="city" maxLength="100" className="input" defaultValue={hotel.city || ""} /></label>
          <label className="field"><span className="label">State</span><input name="state" className="input" defaultValue={hotel.state || ""} /></label>
          <label className="field"><span className="label">Postal code</span><input name="postalCode" pattern="[0-9]{6}" title="Enter a 6-digit postal code" className="input" defaultValue={hotel.postalCode || ""} /></label>
          <label className="field"><span className="label">Website</span><input name="website" type="url" className="input" defaultValue={hotel.website || ""} placeholder="https://" /></label>
          <label className="field"><span className="label">Brand colour</span><input name="brandColor" type="color" className="input h-11 p-1" defaultValue={hotel.brandColor || "#6256d9"} /></label>
        </div>

        <div className="flex items-center justify-between gap-3">
          {!firstTime && <Link to="/owner" className="btn-outline">Cancel</Link>}
          <button disabled={busy} className="btn-primary ml-auto">{busy ? "Saving…" : firstTime ? "Save and continue" : "Save changes"}</button>
        </div>
      </form>
    </Shell>
  );
}

function Shell({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <header className="border-b border-ink-100 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Brand />
          <button className="btn-outline btn-sm" onClick={() => { logout(); navigate("/"); }}>Sign out</button>
        </div>
      </header>
      <main className="container-page py-10">{children}</main>
    </div>
  );
}
