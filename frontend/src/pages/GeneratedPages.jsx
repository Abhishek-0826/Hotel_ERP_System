import { useCallback, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { analyticsApi, reportsApi } from "../api/analytics";
import { bookingApi } from "../api/bookings";
import { getApiErrorMessage } from "../api/client";
import { experienceApi, financeApi, managementApi, receptionApi } from "../api/operations";
import { propertyApi } from "../api/properties";
import { systemApi } from "../api/system";
import DashboardLayout from "../components/layout/DashboardLayout";
import RoostLayout from "../components/layout/RoostLayout";
import DataTable from "../components/ui/DataTable";
import KpiCard from "../components/ui/KpiCard";
import Modal from "../components/ui/Modal";
import { Activity, Archive, BedDouble, Camera, CheckCircle2, ClipboardList, CreditCard, DollarSign, Plus, UserCheck, Users } from "../components/icons";
import { useAppState } from "../context/AppStateContext";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { OWNER_ROLES, STAFF_ROLES } from "../utils/roles";
import { getNavForRole } from "../utils/navigation";
import BookingFilters, { EMPTY_BOOKING_FILTERS, bookingFilterParams } from "../components/booking/BookingFilters";
import { approveDisabledReason } from "../utils/bookingRules";
import { nextDayInput, stayDatesError, todayInput } from "../utils/dates";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString() : "—";
export function Shell({ title, children }) { const { user } = useAuth(); const Layout = OWNER_ROLES.includes(user?.role) || STAFF_ROLES.includes(user?.role) ? DashboardLayout : RoostLayout; return <Layout title={title} nav={getNavForRole(user?.role)}>{children}</Layout>; }
export function Header({ title, text, action }) { return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">ROOST operations</p><h1 className="mt-1 text-2xl font-extrabold text-ink-900">{title}</h1>{text && <p className="mt-1 text-sm text-ink-500">{text}</p>}</div>{action}</div>; }
export function Notice({ error }) { return error ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null; }
export function Status({ value }) { return <span className="badge normal-case tracking-normal">{value || "—"}</span>; }
// Text inputs reject whitespace-only values and cap their length; callers can override either via props.
export function Field({ label, name, type = "text", required = true, ...props }) {
  const textual = type === "text";
  const textRules = textual ? { maxLength: 255, ...(required && !props.pattern ? { pattern: ".*\\S.*", title: `${label} cannot be blank` } : {}) } : {};
  return <label className="field"><span className="label">{label}</span><input name={name} type={type} required={required} className="input" {...textRules} {...props} /></label>;
}
export function useAction() {
  const { pushToast } = useAppState();
  const [busy, setBusy] = useState(false);
  const run = async (action, success, after) => {
    setBusy(true);
    try { const result = await action(); pushToast({ type: "success", title: success, message: "The server saved the change." }); if (after) after(result); return result; }
    catch (error) { pushToast({ type: "error", title: "Request failed", message: getApiErrorMessage(error) }); return null; }
    finally { setBusy(false); }
  };
  return { busy, run };
}

function Dashboard({ kind }) {
  const frontDesk = kind === "Reception" || kind === "Staff";
  // Front-desk roles can't read reports, so they get the operational summary instead.
  const fetcher = frontDesk ? receptionApi.dashboard : analyticsApi.dashboard;
  const { data, loading, error } = useApi(fetcher, null);
  const cards = frontDesk
    ? [["Guests in house", data?.currentGuests || 0, Users], ["Occupied beds", data?.occupiedBeds || 0, BedDouble], ["Available beds", data?.availableBeds || 0, CheckCircle2], ["Check-ins due today", data?.checkInsToday || 0, ClipboardList], ["Pending approvals", data?.pendingBookings || 0, ClipboardList], ["Collected today", money(data?.todayCollections), DollarSign]]
    : [["Total beds", data?.totalBeds || 0, BedDouble], ["Occupied beds", data?.occupiedBeds || 0, BedDouble], ["Available beds", data?.availableBeds || 0, CheckCircle2], ["Guests in house", data?.currentGuests || 0, Users], ["Pending bookings", data?.pendingBookings || 0, ClipboardList], ["Revenue", money(data?.revenue), DollarSign]];
  return <Shell title={`${kind} dashboard`}><Header title={`${kind} dashboard`} text="Live operational data from the ROOST API." /><Notice error={error} />{loading ? <p>Loading dashboard...</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, icon]) => <KpiCard key={label} label={label} value={value} icon={icon} color="brand" />)}</div>}</Shell>;
}
export const ManagerDashboard = () => <Dashboard kind="Manager" />;
export const ReceptionDashboard = () => <Dashboard kind="Reception" />;
export const StaffDashboard = () => <Dashboard kind="Staff" />;

export function GuestList() {
  const [query, setQuery] = useState("");
  const { data, loading, error } = useApi(() => receptionApi.guests({ search: query }), [], { deps: [query] });
  return <Shell title="Guests"><Header title="Guest directory" text="Search guests registered for this property." action={<Link className="btn-primary" to="/guests/register"><Plus size={16} /> Register guest</Link>} /><Notice error={error} /><input className="input mb-4 max-w-md" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or phone" />{loading ? <p>Loading guests...</p> : <div className="card p-4"><DataTable data={data} columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "status", label: "Status", render: (value) => <Status value={value} /> }, { key: "actions", label: "", render: (_, row) => <Link className="btn-ghost btn-sm" to={`/guests/${row.id}`}>View</Link> }]} /></div>}</Shell>;
}

export function GuestRegister() {
  const { busy, run } = useAction();
  const submit = (event) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); run(() => receptionApi.registerGuest({ ...values, gender: String(values.gender).toUpperCase(), idProofType: values.idProofType || undefined, idProofNumber: values.idProofNumber || undefined }), "Guest registered", () => form.reset()); };
  return <Shell title="Register guest"><Header title="Register a guest" text="Create a verified front-desk guest record." /><form onSubmit={submit} className="card grid max-w-3xl gap-4 p-5 md:grid-cols-2"><Field label="Full name" name="name" /><Field label="Phone" name="phone" pattern="[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" /><Field label="Email" name="email" type="email" required={false} /><label className="field"><span className="label">Gender</span><select name="gender" className="input" required defaultValue=""><option value="" disabled>Select gender</option><option>Female</option><option>Male</option><option>Other</option></select></label><Field label="ID proof type" name="idProofType" required={false} placeholder="AADHAAR / PASSPORT" /><Field label="ID proof number" name="idProofNumber" required={false} /><Field label="Address" name="address" required={false} /><Field label="City" name="city" required={false} /><button disabled={busy} className="btn-primary md:col-span-2">{busy ? "Saving..." : "Register guest"}</button></form></Shell>;
}

export function GuestProfile() {
  const { id } = useParams();
  const { data, loading, error } = useApi(() => receptionApi.guests(), []);
  const guest = data.find((item) => String(item.id) === id);
  return <Shell title="Guest profile"><Header title={guest?.name || "Guest profile"} text={guest ? `${guest.email || "No email"} · ${guest.phone || "No phone"}` : "Guest details"} /><Notice error={error} />{loading ? <p>Loading guest...</p> : guest ? <section className="card max-w-2xl p-5"><dl className="grid gap-4 sm:grid-cols-2">{Object.entries({ Status: guest.status, Address: guest.profile?.address, City: guest.profile?.city, "ID type": guest.profile?.idProofType }).map(([label, value]) => <div key={label}><dt className="label">{label}</dt><dd className="font-semibold">{value || "—"}</dd></div>)}</dl></section> : <p>Guest not found.</p>}</Shell>;
}

export function BookingList() {
  const { user } = useAuth();
  const canApprove = ["OWNER", "MANAGER"].includes(user?.role);
  const [filters, setFilters] = useState(EMPTY_BOOKING_FILTERS);
  const changeFilters = useCallback((next) => setFilters(next), []);
  const { data, loading, error, reload } = useApi(() => bookingApi.ownerListAll(bookingFilterParams(filters)), [], { deps: [filters] });
  const { data: properties } = useApi(() => propertyApi.mine(), []);
  const { run } = useAction();
  const update = (code, action) => run(() => bookingApi.update(code, action), "Booking approved", reload);
  const approveCell = (row) => {
    const reason = approveDisabledReason(row.status) || (canApprove ? null : "Only a manager or the owner can approve bookings.");
    return <span title={reason || undefined}><button className="btn-ghost btn-sm" disabled={Boolean(reason)} onClick={() => update(row.bookingCode, "approve")}>Approve</button></span>;
  };
  return <Shell title="Bookings"><Header title="Bookings" text="Live reservations for your tenant." action={<Link className="btn-primary" to="/bookings/new"><Plus size={16} /> New booking</Link>} /><Notice error={error} /><BookingFilters filters={filters} onChange={changeFilters} properties={properties} />{loading ? <p>Loading bookings...</p> : <div className="card p-4"><DataTable data={data} emptyMessage="No bookings match these filters." columns={[{ key: "bookingCode", label: "Booking" }, { key: "guestName", label: "Guest" }, { key: "propertyName", label: "Property" }, { key: "checkIn", label: "Check-in", render: date }, { key: "paymentStatus", label: "Payment", render: (value) => <Status value={String(value || "UNPAID").replace("_", " ")} /> }, { key: "status", label: "Status", render: (value) => <Status value={value} /> }, { key: "actions", label: "", render: (_, row) => approveCell(row) }]} /></div>}</Shell>;
}

function Select({ label, name, value, onChange, options, disabled }) { return <label className="field"><span className="label">{label}</span><select required name={name} className="input" value={value} onChange={onChange} disabled={disabled}><option value="">Select {label.toLowerCase()}</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label> }
export function BookingNew() {
  const { busy, run } = useAction();
  const [propertyId, setPropertyId] = useState(""); const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState(""); const [checkOut, setCheckOut] = useState("");
  const today = todayInput();
  const datesError = checkIn && checkOut ? stayDatesError(checkIn, checkOut) : null;
  const datesValid = Boolean(checkIn && checkOut && !datesError);
  const { data: guests } = useApi(() => receptionApi.guests({}), []);
  const { data: properties } = useApi(() => propertyApi.mine(), []);
  const list = (value) => Array.isArray(value) ? value : value?.items || [];
  const slug = list(properties).find((p) => String(p.id) === propertyId)?.slug;
  // Only rooms and beds that are actually free for the chosen dates are offered.
  const { data: availability, error: availabilityError } = useApi(() => slug && datesValid ? propertyApi.availability(slug, { checkIn, checkOut }) : Promise.resolve(null), null, { deps: [slug, checkIn, checkOut, datesValid] });
  const freeRooms = (availability?.rooms || []).filter((r) => (r.beds || []).some((b) => b.isBookable));
  const freeBeds = (freeRooms.find((r) => String(r.id) === roomId)?.beds || []).filter((b) => b.isBookable);
  const resetPick = () => setRoomId("");
  const submit = (event) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); run(() => receptionApi.createBooking({ ...values, checkIn, checkOut, source: "WALK_IN" }), "Booking created", () => { form.reset(); setPropertyId(""); setRoomId(""); setCheckIn(""); setCheckOut(""); }); };
  return <Shell title="New booking"><Header title="Create front-desk booking" text="Pick a registered guest, the property and dates, then an available room and bed." /><form onSubmit={submit} className="card grid max-w-3xl gap-4 p-5 md:grid-cols-2">
    <div className="md:col-span-2"><Select label="Guest" name="guestId" options={list(guests).map((g) => [g.id, `${g.name} · ${g.phone || g.email}`])} /></div>
    <Select label="Property" name="propertyId" value={propertyId} onChange={(e) => { setPropertyId(e.target.value); resetPick(); }} options={list(properties).map((p) => [p.id, p.name])} />
    <span />
    <Field label="Check-in" name="checkIn" type="date" min={today} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(""); resetPick(); }} />
    <Field label="Check-out" name="checkOut" type="date" min={checkIn ? nextDayInput(checkIn) : today} value={checkOut} onChange={(e) => { setCheckOut(e.target.value); resetPick(); }} />
    <Select label="Room" name="roomId" value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={!propertyId || !datesValid} options={freeRooms.map((r) => [r.id, r.roomNumber])} />
    <Select label="Bed" name="bedId" disabled={!roomId} options={freeBeds.map((b) => [b.id, b.bedCode || b.id])} />
    {datesError && <p role="alert" className="text-sm text-rose-700 md:col-span-2">{datesError}</p>}
    {availabilityError && <p className="text-sm text-rose-700 md:col-span-2">Could not load availability. Make sure the property is published.</p>}
    {datesValid && propertyId && availability && !freeRooms.length && <p className="text-sm text-ink-500 md:col-span-2">No rooms have a free bed for these dates.</p>}
    <button disabled={busy} className="btn-primary md:col-span-2">{busy ? "Creating..." : "Create booking"}</button></form></Shell>;
}

const BED_STYLE = { OCCUPIED: "border-rose-200 bg-rose-50", RESERVED: "border-amber-200 bg-amber-50", AVAILABLE: "border-emerald-200 bg-emerald-50", MAINTENANCE: "border-ink-200 bg-ink-100" };
export function BedGrid() {
  const [propertyId, setPropertyId] = useState("");
  const [filter, setFilter] = useState("ALL");
  const { data: properties } = useApi(() => propertyApi.mine(), []);
  const { data: occupancy, loading, error } = useApi(() => propertyId ? receptionApi.occupancy(propertyId) : Promise.resolve(null), null, { deps: [propertyId] });
  const summary = occupancy?.summary || { total: 0, occupied: 0, reserved: 0, available: 0 };
  const beds = (occupancy?.beds || []).filter((bed) => filter === "ALL" || bed.status === filter);
  const tabs = [["ALL", "All", summary.total], ["OCCUPIED", "Occupied", summary.occupied], ["RESERVED", "Reserved", summary.reserved], ["AVAILABLE", "Available", summary.available]];
  return <Shell title="Beds"><Header title="Room and bed availability" text="Live occupancy — see which beds are taken and by whom." /><Notice error={error} /><select className="input mb-5 max-w-sm" value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setFilter("ALL"); }}><option value="">Select property</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{!propertyId ? <p className="text-sm text-ink-500">Choose a property to see its beds.</p> : loading ? <p>Loading beds...</p> : <><div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Total beds" value={summary.total} icon={BedDouble} color="brand" /><KpiCard label="Occupied beds" value={summary.occupied} icon={Users} color="orange" /><KpiCard label="Reserved" value={summary.reserved} icon={ClipboardList} color="blue" /><KpiCard label="Available" value={summary.available} icon={CheckCircle2} color="green" /></div><div className="mb-4 flex flex-wrap gap-2">{tabs.map(([value, label, count]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`chip ${filter === value ? "!border-brand-500 !bg-brand-50 !text-brand-700" : ""}`}>{label} ({count})</button>)}</div>{beds.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{beds.map((bed) => <article key={bed.id} className={`rounded-xl border p-4 ${BED_STYLE[bed.status] || BED_STYLE.AVAILABLE}`}><div className="flex items-center justify-between"><b className="text-ink-900">Room {bed.roomNumber} · {bed.bedCode}</b><Status value={bed.status} /></div>{bed.guestName ? <p className="mt-2 text-sm text-ink-700">{bed.guestName}<span className="block text-xs text-ink-500">{bed.bookingCode} · {date(bed.checkIn)} – {date(bed.checkOut)}</span></p> : <p className="mt-2 text-sm text-ink-500">No guest assigned</p>}</article>)}</div> : <p className="text-sm text-ink-500">No beds in this state.</p>}</>}</Shell>;
}
export function BedAllocation() { return <Navigate to="/bookings/new" replace />; }

function StayAction() {
  const [code, setCode] = useState(""); const { busy, run } = useAction();
  const submit = (event) => { event.preventDefault(); run(() => receptionApi.checkOut(code), "Guest checked out", () => setCode("")); };
  return <Shell title="Check-out"><Header title="Guest check-out" text="Enter the booking code of the guest who is leaving." /><form onSubmit={submit} className="card max-w-xl space-y-4 p-5"><Field label="Booking code" name="bookingCode" value={code} onChange={(event) => setCode(event.target.value)} /><button disabled={busy} className="btn-primary">{busy ? "Processing..." : "Confirm check-out"}</button></form></Shell>;
}
export const CheckOut = () => <StayAction />;

export function InvoiceList() {
  const [number, setNumber] = useState(""); const [invoice, setInvoice] = useState(null); const { busy, run } = useAction();
  const submit = (event) => { event.preventDefault(); run(() => financeApi.invoice(number), "Invoice loaded", setInvoice); };
  return <Shell title="Invoices"><Header title="Invoice lookup" text="Look up an invoice by its exact server-issued number." /><form onSubmit={submit} className="card flex max-w-2xl gap-3 p-5"><input className="input" value={number} onChange={(event) => setNumber(event.target.value)} placeholder="Invoice number" required /><button disabled={busy} className="btn-primary">Search</button></form>{invoice && <section className="card mt-5 max-w-2xl p-5"><h2 className="font-bold">{invoice.invoiceNumber}</h2><p className="mt-2">Total: {money(invoice.totalAmount)}</p><Status value={invoice.status} /></section>}</Shell>;
}

export function Refunds() {
  const { busy, run } = useAction(); const submit = (event) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); run(() => financeApi.requestRefund({ ...values, amount: Number(values.amount) }), "Refund requested", () => form.reset()); };
  return <Shell title="Refunds"><Header title="Request refund" text="Submit a refund against a paid payment record." /><form onSubmit={submit} className="card grid max-w-2xl gap-4 p-5"><Field label="Payment ID" name="paymentId" /><Field label="Amount" name="amount" type="number" min="0.01" step="0.01" /><Field label="Reason" name="reason" minLength="5" /><button disabled={busy} className="btn-primary">Request refund</button></form></Shell>;
}

function UsersPage({ role, title = "Staff" }) {
  const { user } = useAuth(); const isPlatform = ["PLATFORM_ADMIN", "ADMIN"].includes(user?.role);
  const availableRoles = isPlatform ? ["STAFF", "RECEPTIONIST", "MANAGER", "OWNER"] : user?.role === "OWNER" ? ["STAFF", "RECEPTIONIST", "MANAGER"] : ["STAFF", "RECEPTIONIST"];
  const canManage = (row) => isPlatform || (user?.role === "OWNER" ? ["STAFF", "RECEPTIONIST", "MANAGER"] : ["STAFF", "RECEPTIONIST"]).includes(row.role);
  const list = () => isPlatform ? managementApi.platformUsers(role ? { role } : undefined) : managementApi.users(role ? { role } : undefined);
  const { data, loading, error, reload } = useApi(list, [], { deps: [role, isPlatform] }); const { busy, run } = useAction(); const [confirm, setConfirm] = useState(null); const [secret, setSecret] = useState(null);
  const submit = (event) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const payload = { ...values, role: role || values.role }; if (!payload.phone) delete payload.phone; if (!payload.tenantId) delete payload.tenantId; run(() => isPlatform ? managementApi.createPlatformUser(payload) : managementApi.createUser(payload), "User created", () => { form.reset(); reload(); }); };
  const changeStatus = (row) => isPlatform
    ? managementApi.updatePlatformUser(row.id, { status: row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })
    : managementApi.updateUserStatus(row.id, row.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
  const confirmAction = async () => {
    const { type, row } = confirm; setConfirm(null);
    if (type === "delete") await run(() => isPlatform ? managementApi.deletePlatformUser(row.id) : managementApi.deleteUser(row.id), "User deleted", reload);
    else await run(() => isPlatform ? managementApi.resetPlatformUserPassword(row.id) : managementApi.resetUserPassword(row.id), "Password reset", (result) => setSecret({ name: row.name, email: row.email, password: result.temporaryPassword }));
  };
  const modals = <>
    <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} size="sm" title={confirm?.type === "delete" ? "Delete user?" : "Reset password?"}
      footer={<><button className="btn-outline" onClick={() => setConfirm(null)}>Cancel</button><button className={confirm?.type === "delete" ? "btn-primary !bg-rose-600 hover:!bg-rose-700" : "btn-primary"} disabled={busy} onClick={confirmAction}>{confirm?.type === "delete" ? "Delete user" : "Reset password"}</button></>}>
      <p className="text-sm text-ink-600">{confirm?.type === "delete"
        ? <>This permanently deletes <b>{confirm?.row.name}</b> ({confirm?.row.email}) and their login. This cannot be undone. To block access but keep the account, use Suspend instead.</>
        : <>A new temporary password will be generated for <b>{confirm?.row.name}</b>. Their current password stops working immediately.</>}</p>
    </Modal>
    <Modal open={Boolean(secret)} onClose={() => setSecret(null)} size="sm" title="Temporary password"
      footer={<><button className="btn-outline" onClick={() => navigator.clipboard?.writeText(`Email: ${secret.email}
Temporary password: ${secret.password}`)}>Copy details</button><button className="btn-primary" onClick={() => setSecret(null)}>Done</button></>}>
      <p className="text-sm text-ink-600">Share this with <b>{secret?.name}</b>. It is shown only once, so copy it now. They will be asked to choose a new password after signing in.</p>
      <dl className="mt-3 space-y-2 rounded-xl bg-ink-50 p-3 text-sm"><div><dt className="label">Email</dt><dd className="font-mono text-xs">{secret?.email}</dd></div><div><dt className="label">Temporary password</dt><dd className="break-all font-mono text-xs">{secret?.password}</dd></div></dl>
    </Modal>
  </>;
  return <Shell title={title}>{modals}<Header title={title} text="Manage staff accounts through the API." /><Notice error={error} /><form onSubmit={submit} className="card mb-5 grid gap-4 p-5 md:grid-cols-3"><Field label="Name" name="name" /><Field label="Email" name="email" type="email" /><Field label="Phone" name="phone" required={false} pattern="[6-9][0-9]{9}" />{!role && <label className="field"><span className="label">Role</span><select name="role" className="input">{availableRoles.map((item) => <option key={item}>{item}</option>)}</select></label>}{isPlatform && <Field label="Tenant ID" name="tenantId" required={false} placeholder="Required except platform admin" />}<Field label="Temporary password" name="password" type="password" minLength="12" /><button disabled={busy} className="btn-primary self-end">Create account</button></form>{loading ? <p>Loading users...</p> : <div className="card p-4"><DataTable data={data} columns={[{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role" }, { key: "tenantId", label: "Tenant" }, { key: "status", label: "Status", render: (value) => <Status value={value} /> }, { key: "actions", label: "", render: (_, row) => canManage(row) && row.id !== user?.id ? <div className="flex flex-wrap gap-1"><button className="btn-ghost btn-sm" onClick={() => run(() => changeStatus(row), "Status updated", reload)}>{row.status === "ACTIVE" ? "Suspend" : "Activate"}</button><button className="btn-ghost btn-sm" onClick={() => setConfirm({ type: "reset", row })}>Reset password</button><button className="btn-ghost btn-sm text-rose-600" onClick={() => setConfirm({ type: "delete", row })}>Delete</button></div> : null }]} /></div>}</Shell>;
}
export const StaffList = () => <UsersPage />;
export const UsersAdmin = () => <UsersPage title="Users" />;
export const ManagersAdmin = () => <UsersPage role="MANAGER" title="Managers" />;
export const ReceptionistsAdmin = () => <UsersPage role="RECEPTIONIST" title="Receptionists" />;

export function Inventory() {
  const { data, loading, error, reload } = useApi(() => managementApi.inventory(), []); const { busy, run } = useAction();
  const { data: properties } = useApi(() => propertyApi.mine(), []);
  const propertyName = (id) => properties.find((item) => String(item.id) === String(id))?.name || id;
  const submit = (event) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const payload = { ...values }; if (!payload.costPerUnit) delete payload.costPerUnit; run(() => managementApi.createInventoryItem(payload), "Inventory item created", () => { form.reset(); reload(); }); };
  return <Shell title="Inventory"><Header title="Inventory" text="Live stock levels and reorder alerts." /><Notice error={error} /><form onSubmit={submit} className="card mb-5 grid gap-4 p-5 md:grid-cols-4"><label className="field"><span className="label">Property</span><select required name="propertyId" className="input" defaultValue=""><option value="" disabled>Select property</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Field label="Item name" name="name" /><label className="field"><span className="label">Category</span><select name="category" className="input"><option>RECURRING</option><option>NON_RECURRING</option></select></label><Field label="Unit" name="unit" defaultValue="PIECE" /><Field label="Opening stock" name="openingStock" type="number" min="0" step="any" defaultValue="0" /><Field label="Minimum stock" name="minStockLevel" type="number" min="0" step="any" defaultValue="0" /><Field label="Cost per unit" name="costPerUnit" type="number" min="0" step="any" required={false} /><button disabled={busy || !properties.length} className="btn-primary self-end">Add item</button></form>{loading ? <p>Loading inventory...</p> : <div className="card p-4"><DataTable data={data} columns={[{ key: "name", label: "Item" }, { key: "propertyId", label: "Property", render: propertyName }, { key: "category", label: "Category" }, { key: "currentStock", label: "Stock" }, { key: "minStockLevel", label: "Minimum" }, { key: "unit", label: "Unit" }, { key: "lowStock", label: "Alert", render: (value) => value ? "Low stock" : "OK" }]} /></div>}</Shell>;
}

export function Complaints() {
  const { data, loading, error, reload } = useApi(() => experienceApi.complaints(), []); const { run } = useAction();
  return <Shell title="Complaints"><Header title="Complaints" text="Review and resolve guest issues." /><Notice error={error} />{loading ? <p>Loading complaints...</p> : <div className="card p-4"><DataTable data={data} columns={[{ key: "complaintCode", label: "Complaint" }, { key: "subject", label: "Subject" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status", render: (value) => <Status value={value} /> }, { key: "actions", label: "", render: (_, row) => !["RESOLVED", "CLOSED"].includes(row.status) ? <button className="btn-ghost btn-sm" onClick={() => run(() => experienceApi.updateComplaint(row.id, { status: "RESOLVED", resolution: "Resolved by operations" }), "Complaint resolved", reload)}>Resolve</button> : null }]} /></div>}</Shell>;
}

export function Feedback() {
  const { data, loading, error } = useApi(() => experienceApi.feedbackAnalysis(), null);
  const { data: reviews, error: reviewsError } = useApi(() => experienceApi.listFeedback(), []);
  const stars = (value) => value ? `${"★".repeat(value)}${"☆".repeat(5 - value)}` : "—";
  return <Shell title="Feedback"><Header title="Feedback analysis" text="Guest ratings and comments for your property." /><Notice error={error || reviewsError} />{loading ? <p>Loading feedback...</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(data?.averages || {}).map(([key, value]) => <KpiCard key={key} label={`${key} rating`} value={Number(value).toFixed(1)} icon={Activity} color="brand" />)}</div>}<div className="card mt-6 p-4"><DataTable data={reviews} columns={[{ key: "guestName", label: "Guest" }, { key: "bookingCode", label: "Booking" }, { key: "overallRating", label: "Overall", render: stars }, { key: "cleanlinessRating", label: "Cleanliness", render: stars }, { key: "serviceRating", label: "Service", render: stars }, { key: "valueRating", label: "Value", render: stars }, { key: "comment", label: "Comment" }, { key: "createdAt", label: "Date", render: date }]} /></div></Shell>;
}

export function AccessControl() {
  const { data, loading, error } = useApi(() => systemApi.accessControl(), null);
  const rows = Object.entries(data?.permissions || {}).map(([role, permissions]) => ({ id: role, role, permissions: permissions.join(", ") }));
  return <Shell title="Access control"><Header title="Access control" text="Server-enforced role permissions." /><Notice error={error} />{loading ? <p>Loading permissions...</p> : <div className="card p-4"><DataTable data={rows} columns={[{ key: "role", label: "Role" }, { key: "permissions", label: "Permissions" }]} /></div>}</Shell>;
}

export function Reports() { return <Shell title="Reports"><Header title="Reports" text="Open live operational reports." /><div className="grid gap-4 sm:grid-cols-3">{[["Occupancy", "/reports/download?type=occupancy", BedDouble], ["Revenue", "/reports/download?type=revenue", DollarSign], ["Staff performance", "/reports/download?type=staff", UserCheck]].map(([label, to, Icon]) => <Link key={label} className="card p-5" to={to}><Icon size={22} /><h2 className="mt-3 font-bold">{label}</h2></Link>)}</div></Shell>; }

function Analytics({ period }) {
  const fetcher = period === "Weekly" ? reportsApi.weekly : period === "Monthly" ? reportsApi.monthly : analyticsApi.dashboard;
  const { data, loading, error } = useApi(fetcher, null, { deps: [period] });
  const cards = period === "Business"
    ? [["Revenue", money(data?.revenue), DollarSign, "green"], ["Occupied beds", data?.occupiedBeds || 0, BedDouble, "brand"], ["Pending payments", data?.pendingPayments || 0, CreditCard, "orange"], ["Guests", data?.totalGuests || 0, Users, "blue"]]
    : [["Period", `${data?.periodDays || 0} days`, Activity, "brand"], ["Bookings", data?.bookings || 0, ClipboardList, "blue"], ["Revenue", money(data?.revenue), DollarSign, "green"], ["Average feedback", Number(data?.averageFeedback || 0).toFixed(1), Activity, "orange"]];
  return <Shell title={`${period} analytics`}><Header title={`${period} analytics`} text="Live revenue, occupancy and booking metrics." /><Notice error={error} />{loading ? <p>Loading analytics...</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, icon, color]) => <KpiCard key={label} label={label} value={value} icon={icon} color={color} />)}</div>}</Shell>;
}
export const BusinessIntelligence = () => <Analytics period="Business" />;
export const BiWeekly = () => <Analytics period="Weekly" />;
export const BiMonthly = () => <Analytics period="Monthly" />;

const SETTING_FIELDS = [["property_name", "Property name"], ["check_in_time", "Check-in time"], ["check_out_time", "Check-out time"], ["tax_rate", "Tax rate (%)"]];
const stamp = (value) => value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not saved yet";
export function SystemSettings() {
  const { data, loading, error, reload } = useApi(() => systemApi.settings(), null); const { busy, run } = useAction(); const { pushToast } = useAppState();
  const [formKey, setFormKey] = useState(0);
  const general = data?.GENERAL || {}; const updatedAt = data?._meta?.updatedAt || {};
  const lastSaved = Object.values(updatedAt).filter(Boolean).sort().pop();
  const submit = (event) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const settings = Object.entries(values).map(([key, value]) => ({ key, value: String(value), category: "GENERAL" }));
    run(() => systemApi.updateSettings({ settings }), "Settings updated", async () => {
      await reload(); setFormKey((key) => key + 1);
      pushToast({ type: "success", title: "Timings saved", message: `Check-in ${values.check_in_time || "—"} · Check-out ${values.check_out_time || "—"}` });
    });
  };
  return <Shell title="Settings"><Header title="System settings" text="Tenant settings stored by the backend." /><Notice error={error} />{loading && !data ? <p>Loading settings...</p> : <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.4fr_1fr]"><form key={formKey} onSubmit={submit} className="card grid gap-4 p-5 md:grid-cols-2">{SETTING_FIELDS.map(([name, label]) => <Field key={name} label={label} name={name} type={name === "tax_rate" ? "number" : "text"} step={name === "tax_rate" ? "any" : undefined} required={name !== "tax_rate"} defaultValue={general[name] || (name === "tax_rate" ? "0" : "")} placeholder={name.includes("time") ? "e.g. 12:00 PM" : undefined} />)}<div className="md:col-span-2"><button disabled={busy} className="btn-primary btn-sm">{busy ? "Saving..." : "Save settings"}</button></div></form><section className="card p-5"><h2 className="font-bold text-ink-900">Current settings</h2><p className="mt-1 text-xs text-ink-500">Last updated: {stamp(lastSaved)}</p><dl className="mt-4 space-y-3">{SETTING_FIELDS.map(([name, label]) => <div key={name}><dt className="label !mb-0">{label}</dt><dd className="font-semibold text-ink-900">{general[name] || "—"}</dd><dd className="text-[11px] text-ink-400">{updatedAt[name] ? `Updated ${stamp(updatedAt[name])}` : ""}</dd></div>)}</dl></section></div>}</Shell>;
}

export function Cameras() {
  const { data, loading, error, reload } = useApi(() => systemApi.camera(), null); const { busy, run } = useAction();
  const submit = (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); run(() => systemApi.updateCamera({ enabled: values.enabled === "on", recordingEnabled: values.recordingEnabled === "on", ...(values.streamUrl ? { streamUrl: values.streamUrl } : {}) }), "Camera settings updated", reload); };
  return <Shell title="Cameras"><Header title="Camera configuration" text="Configure the camera integration without exposing credentials." /><Notice error={error} />{loading ? <p>Loading camera settings...</p> : <form onSubmit={submit} className="card max-w-2xl space-y-4 p-5"><label className="flex gap-2"><input name="enabled" type="checkbox" defaultChecked={data?.enabled} /> Enabled</label><label className="flex gap-2"><input name="recordingEnabled" type="checkbox" defaultChecked={data?.recordingEnabled} /> Recording enabled</label><Field label="Stream URL" name="streamUrl" type="url" required={false} defaultValue={data?.streamUrl || ""} /><button disabled={busy} className="btn-primary"><Camera size={16} /> Save camera settings</button></form>}</Shell>;
}

export function Backup() {
  const { data, loading, error } = useApi(() => systemApi.backup(), null); const { busy, run } = useAction();
  return <Shell title="Backup"><Header title="Backup & restore" text="Backend-managed backup configuration." /><Notice error={error} />{loading ? <p>Loading backup status...</p> : <section className="card max-w-2xl p-5"><p>Enabled: <b>{data?.backupEnabled ? "Yes" : "No"}</b></p><p className="mt-2">Frequency: <b>{data?.backupFrequency || "Not configured"}</b></p><p className="mt-2">Last completed: <b>{data?.lastBackupAt ? date(data.lastBackupAt) : "No completed backup recorded"}</b></p><button disabled={busy || !data?.backupEnabled} className="btn-outline mt-5" onClick={() => window.confirm("Send a restore request to an operator?") && run(() => systemApi.restore(), "Restore request recorded")}><Archive size={16} /> Request restore</button></section>}</Shell>;
}

export function AuditLogs() {
  const { data, loading, error } = useApi(() => systemApi.auditLogs({ limit: 50 }), null); const rows = data?.data || [];
  return <Shell title="Audit logs"><Header title="Audit logs" text="Immutable server-side activity records." /><Notice error={error} />{loading ? <p>Loading audit logs...</p> : <div className="card p-4"><DataTable data={rows} columns={[{ key: "createdAt", label: "Date", render: date }, { key: "action", label: "Action" }, { key: "entityType", label: "Entity" }, { key: "entityId", label: "Entity ID" }, { key: "userId", label: "User ID" }]} /></div>}</Shell>;
}
