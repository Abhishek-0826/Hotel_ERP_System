import { useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { authApi } from "../../api/auth";
import { SUPABASE_AUTH } from "../../lib/supabase";
import { bookingApi } from "../../api/bookings";
import { getApiErrorMessage } from "../../api/client";
import { experienceApi } from "../../api/operations";
import RoostLayout from "../../components/layout/RoostLayout";
import DataTable from "../../components/ui/DataTable";
import KpiCard from "../../components/ui/KpiCard";
import { BedDouble, CalendarDays, CheckCircle2, Lock, Plus, Wallet } from "../../components/icons";
import { guestNav } from "../../utils/navigation";
import { useAppState } from "../../context/AppStateContext";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import MyBookings from "../booking/MyBookings";
import AuthLayout from "../auth/AuthLayout";
import Pagination, { usePagination } from "../../components/ui/Pagination";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
function Shell({ title, children }) {
  return <RoostLayout title={title} nav={guestNav}>{children}</RoostLayout>;
}

function Header({ eyebrow = "ROOST guest portal", title, text, action }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>{text && <p className="mt-1 text-sm text-ink-500">{text}</p>}</div>{action}</div>;
}

function Notice({ error }) {
  return error ? <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null;
}

const bookingStatus = (value) => <span className="badge normal-case tracking-normal">{value || "PENDING"}</span>;

export function UserDashboard() {
  const { user } = useAuth();
  const { data: bookings, loading, error } = useApi(() => bookingApi.mine(), []);
  const current = bookings.find((item) => ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(item.status));
  const paid = bookings.filter((item) => item.paymentStatus === "PAID").reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

  return <Shell title="My dashboard"><Header title={`Welcome${user?.name ? `, ${user.name}` : ""}`} text="Your live bookings and stay status." action={<Link className="btn-primary" to="/properties"><Plus size={16} /> Book a stay</Link>} /><Notice error={error} />{loading ? <p>Loading bookings...</p> : <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Active booking" value={current?.bookingCode || "None"} sub={current?.status || "No active booking"} icon={CalendarDays} color="brand" /><KpiCard label="Room / bed" value={current?.roomName || "—"} sub={current?.bedCode || "Not assigned"} icon={BedDouble} color="green" /><KpiCard label="Check-in" value={current?.checkIn ? new Date(current.checkIn).toLocaleDateString() : "—"} sub={current?.checkOut ? `Check-out ${new Date(current.checkOut).toLocaleDateString()}` : "No dates"} icon={CheckCircle2} color="blue" /><KpiCard label="Recorded payments" value={money(paid)} sub={`${bookings.length} booking${bookings.length === 1 ? "" : "s"}`} icon={Wallet} color="orange" /></div>{current && <section className="card mt-6 p-5"><h2 className="font-bold">Current booking</h2><p className="mt-1 text-sm text-ink-500">{current.propertyName || "Property"} · {current.bookingCode}</p><Link className="btn-outline btn-sm mt-4" to={`/booking/${current.bookingCode}`}>View details</Link></section>}</>}</Shell>;
}

export function UserBookings() { return <MyBookings />; }
export function UserBookingDetails() { const { id } = useParams(); return <Navigate to={`/booking/${encodeURIComponent(id)}`} replace />; }
export function UserBookingNew() { return <Navigate to="/properties" replace />; }
export function Rooms() { return <Navigate to="/properties" replace />; }
export function RoomDetails() { return <Navigate to="/properties" replace />; }

export function UserPayments() {
  const { data: bookings, loading, error } = useApi(() => bookingApi.mine(), []);
  const rows = bookings.map((item) => ({ ...item, amount: item.totalAmount, payment: item.paymentStatus || "UNPAID" }));
  return <Shell title="Payments"><Header title="Payment status" text="Payment status reported by each property." /><Notice error={error} />{loading ? <p>Loading payment status...</p> : <div className="card p-4"><DataTable data={rows} columns={[{ key: "bookingCode", label: "Booking" }, { key: "propertyName", label: "Property" }, { key: "amount", label: "Amount", render: money }, { key: "payment", label: "Status", render: bookingStatus }]} /></div>}</Shell>;
}

export function UserPaymentDetails() {
  const { id } = useParams();
  return <Shell title="Payment details"><Header title="Payment details" text="Guest payment receipts are issued by the property." /><div className="card max-w-2xl p-6"><p className="text-sm text-ink-600">Reference: {id}</p><p className="mt-2 text-sm text-ink-500">Contact the property for the invoice or receipt associated with this payment.</p><Link className="btn-outline mt-5" to="/payments">Back to payments</Link></div></Shell>;
}

export function ProfileBody({ eyebrow = "ROOST guest portal" }) {
  const { user, updateProfile, refreshProfile } = useAuth();
  const { pushToast } = useAppState();
  const [editing, setEditing] = useState(false);
  const location = useLocation();
  const forced = Boolean(location.state?.mustChangePassword) || Boolean(user?.mustChangePassword && user?.role !== "OWNER");
  const [changingPassword, setChangingPassword] = useState(forced);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await updateProfile(Object.fromEntries(new FormData(event.currentTarget))); setEditing(false); pushToast({ type: "success", title: "Profile updated", message: "Your profile was saved." }); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "Unable to update profile.")); }
    finally { setBusy(false); }
  };
  const changePassword = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.newPassword !== values.confirmPassword) { setError("New passwords do not match."); setBusy(false); return; }
    try { await authApi.changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword }); setChangingPassword(false); await refreshProfile().catch(() => {}); pushToast({ type: "success", title: "Password updated", message: "Use the new password next time you sign in." }); }
    catch (requestError) { setError(getApiErrorMessage(requestError, "Unable to change password.")); }
    finally { setBusy(false); }
  };

  return <><Header eyebrow={eyebrow} title="My profile" text="Keep your personal and contact details up to date." action={<button className="btn-primary" onClick={() => { setError(""); setEditing(true); }}>Edit profile</button>} /><Notice error={error} /><section className="card max-w-2xl p-5"><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="label">Full name</dt><dd className="font-bold">{user?.name || "—"}</dd></div><div><dt className="label">Email</dt><dd className="font-bold">{user?.email || "—"}</dd></div><div><dt className="label">Phone</dt><dd className="font-bold">{user?.phone || "Not provided"}</dd></div><div><dt className="label">Account type</dt><dd className="font-bold capitalize">{String(user?.role || "GUEST").toLowerCase().replace("_", " ")}</dd></div></dl><button className="btn-outline mt-6" onClick={() => { setError(""); setChangingPassword(true); }}><Lock size={16} /> Change password</button></section>{editing && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"><form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-pop"><h2 className="text-lg font-bold">Edit profile</h2><div className="mt-4 grid gap-4"><label className="field"><span className="label">Full name</span><input required name="name" className="input" defaultValue={user.name} /></label><label className="field"><span className="label">Email</span><input required name="email" type="email" className="input" defaultValue={user.email} readOnly={SUPABASE_AUTH} /></label><label className="field"><span className="label">Phone</span><input name="phone" pattern="[6-9][0-9]{9}" className="input" defaultValue={user.phone || ""} /></label><div className="flex gap-3"><button type="button" className="btn-outline" onClick={() => setEditing(false)}>Cancel</button><button disabled={busy} className="btn-primary">{busy ? "Saving..." : "Save changes"}</button></div></div></form></div>}{changingPassword && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"><form onSubmit={changePassword} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-pop"><h2 className="text-lg font-bold">Change password</h2>{forced && <p className="mt-1 text-xs text-amber-700">Your password was reset by an administrator. Choose a new one to continue.</p>}<div className="mt-4 grid gap-4"><label className="field"><span className="label">Current password</span><input required name="oldPassword" type="password" autoComplete="current-password" className="input" /></label><label className="field"><span className="label">New password</span><input required name="newPassword" type="password" minLength="12" autoComplete="new-password" className="input" /></label><label className="field"><span className="label">Confirm password</span><input required name="confirmPassword" type="password" minLength="12" autoComplete="new-password" className="input" /></label><div className="flex gap-3">{!(forced && user?.mustChangePassword) && <button type="button" className="btn-outline" onClick={() => setChangingPassword(false)}>Cancel</button>}<button disabled={busy} className="btn-primary">{busy ? "Updating..." : "Update password"}</button></div></div></form></div>}</>;
}

export function UserProfile() { return <Shell title="Profile"><ProfileBody /></Shell>; }

function BookingSelect({ bookings }) {
  return <label className="field"><span className="label">Booking</span><select required name="bookingId" className="input"><option value="">Select a booking</option>{bookings.map((item) => <option key={item.id} value={item.id}>{item.bookingCode} · {item.propertyName || "Property"}</option>)}</select></label>;
}

export function UserFeedback() {
  const { pushToast } = useAppState();
  const { data: bookings, error } = useApi(() => bookingApi.mine(), []);
  const [ratings, setRatings] = useState({ overall: 5, cleanliness: 5, service: 5, value: 5 });
  const stars = (key, label) => <div key={key}><span className="label">{label}</span><div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button aria-label={`${label} ${value} stars`} type="button" key={value} onClick={() => setRatings((current) => ({ ...current, [key]: value }))} className={`text-2xl ${value <= ratings[key] ? "text-amber-500" : "text-ink-200"}`}>★</button>)}</div></div>;
  const [busy, setBusy] = useState(false);
  const submit = async (event) => { event.preventDefault(); setBusy(true); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); try { await experienceApi.submitFeedback({ bookingId: values.bookingId, overallRating: ratings.overall, cleanlinessRating: ratings.cleanliness, serviceRating: ratings.service, valueRating: ratings.value, comment: values.comment }); form.reset(); setRatings({ overall: 5, cleanliness: 5, service: 5, value: 5 }); pushToast({ type: "success", title: "Feedback submitted", message: "Thank you for sharing your experience." }); } catch (requestError) { pushToast({ type: "error", title: "Submission failed", message: getApiErrorMessage(requestError) }); } finally { setBusy(false); } };
  return <Shell title="Feedback"><Header title="Share feedback" text="Feedback is linked to one of your bookings." /><Notice error={error} /><form onSubmit={submit} className="card max-w-2xl space-y-5 p-5"><BookingSelect bookings={bookings} />{stars("overall", "Overall rating")}{stars("cleanliness", "Cleanliness rating")}{stars("service", "Service rating")}{stars("value", "Value rating")}<label className="field"><span className="label">Comments</span><textarea name="comment" maxLength="2000" className="input min-h-28" /></label><button disabled={busy || !bookings.length} className="btn-primary">{busy ? "Submitting..." : "Submit feedback"}</button></form></Shell>;
}

export function UserComplaints() {
  const { pushToast } = useAppState();
  const { data: bookings } = useApi(() => bookingApi.mine(), []);
  const { data: complaints, loading, error, reload } = useApi(() => experienceApi.myComplaints(), []);
  const [busy, setBusy] = useState(false);
  const paging = usePagination(complaints, { pageSize: 5 });
  const submit = async (event) => { event.preventDefault(); setBusy(true); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); try { await experienceApi.submitComplaint({ ...values, priority: values.priority.toUpperCase() }); form.reset(); await reload(); pushToast({ type: "success", title: "Complaint submitted", message: "The property team can now review it." }); } catch (requestError) { pushToast({ type: "error", title: "Submission failed", message: getApiErrorMessage(requestError) }); } finally { setBusy(false); } };
  return <Shell title="Complaints"><Header title="Support & complaints" text="Create a request linked to your booking and track its status." /><Notice error={error} /><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={submit} className="card space-y-4 p-5"><BookingSelect bookings={bookings} /><label className="field"><span className="label">Category</span><select name="category" className="input"><option value="MAINTENANCE">Maintenance</option><option value="CLEANLINESS">Cleanliness</option><option value="NOISE">Noise</option><option value="SERVICE">Service</option><option value="FOOD">Food</option><option value="SAFETY">Safety</option><option value="OTHER">Other</option></select></label><label className="field"><span className="label">Subject</span><input required name="subject" minLength="3" className="input" /></label><label className="field"><span className="label">Description</span><textarea required name="description" minLength="5" maxLength="5000" className="input min-h-24" /></label><label className="field"><span className="label">Priority</span><select name="priority" className="input"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label><button disabled={busy || !bookings.length} className="btn-primary">{busy ? "Submitting..." : "Create complaint"}</button></form><section className="card p-5"><h2 className="font-bold">Complaint history</h2>{loading ? <p className="mt-3 text-sm">Loading...</p> : <div className="mt-4 space-y-3">{paging.pageItems.map((item) => <article className="rounded-xl bg-ink-50 p-4" key={item.id}><div className="flex justify-between gap-3"><b>{item.subject}</b>{bookingStatus(item.status)}</div><p className="mt-1 text-xs text-ink-400">{item.complaintCode} · {item.priority}</p></article>)}{!complaints.length && <p className="text-sm text-ink-500">No complaints submitted yet.</p>}<Pagination {...paging} /></div>}</section></div></Shell>;
}

export function ForgotPassword() {
  const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(""); const emailOrPhone = new FormData(event.currentTarget).get("emailOrPhone"); try { await authApi.forgotPassword({ emailOrPhone }); setSent(true); } catch (requestError) { setError(getApiErrorMessage(requestError, "Unable to request a reset link.")); } finally { setBusy(false); } };
  return <AuthLayout title="Forgot your password?" subtitle="Enter the email of your account and we'll send you a link to choose a new password.">
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="field"><span className="label">Email address</span><input required name="emailOrPhone" type="email" className="input" autoComplete="username" placeholder="you@example.com" /></label>
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {sent && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">If an account exists for that email, a reset link is on its way. Open it on this device and choose a new password (at least 12 characters).</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? "Sending…" : sent ? "Send again" : "Send reset link"}</button>
      <Link className="link-quiet text-center" to="/login">Back to login</Link>
    </form>
  </AuthLayout>;
}
