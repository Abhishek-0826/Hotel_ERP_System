// In-browser fake of the ROOST REST API (/api/v1). One `Backend` holds the data, so several
// browser contexts (e.g. a guest and an owner) can share it inside a single test.

const ok = (data, status = 200) => ({ status, body: { success: true, data } });
const fail = (status, message, code = "ERROR", errors) => ({ status, body: { success: false, message, code, ...(errors ? { errors } : {}) } });

export const PASSWORD = "Sup3r-secret-pass";

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
export const dates = { checkIn: day(3), checkOut: day(6) };

const nightsBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));

export const TENANT = {
  id: "1",
  slug: "sunrise",
  name: "Sunrise Hostel",
  legalName: "Sunrise Hospitality Pvt Ltd",
  tagline: "Comfortable beds, friendly people",
  description: "A calm hostel in the heart of the city.",
  logoUrl: null,
  brandColor: "#6256d9",
  contactEmail: "hello@sunrise.test",
  contactPhone: "9876543210",
  address: "12 MG Road, Pune",
  addressLine: "12 MG Road",
  city: "Pune",
  state: "Maharashtra",
  postalCode: "411001",
  website: null,
  status: "ACTIVE",
};

const tenantRef = (onboardingCompleted = true) => ({ id: "1", slug: "sunrise", name: TENANT.name, logoUrl: null, onboardingCompleted });

const makeUsers = () => ({
  guest: { id: "u-guest", name: "Gita Guest", email: "guest@sunrise.test", phone: "9123456780", role: "GUEST", status: "ACTIVE", tenantId: "1", tenant: tenantRef(), mustChangePassword: false },
  owner: { id: "u-owner", name: "Omar Owner", email: "owner@sunrise.test", phone: "9123456781", role: "OWNER", status: "ACTIVE", tenantId: "1", tenant: tenantRef(), mustChangePassword: false },
  newOwner: { id: "u-new", name: "Nina Newowner", email: "newowner@sunrise.test", phone: null, role: "OWNER", status: "ACTIVE", tenantId: "1", tenant: tenantRef(false), mustChangePassword: true },
  manager: { id: "u-manager", name: "Mia Manager", email: "manager@sunrise.test", phone: null, role: "MANAGER", status: "ACTIVE", tenantId: "1", tenant: tenantRef(), mustChangePassword: false },
  reception: { id: "u-reception", name: "Ravi Reception", email: "reception@sunrise.test", phone: null, role: "RECEPTIONIST", status: "ACTIVE", tenantId: "1", tenant: tenantRef(), mustChangePassword: false },
  staff: { id: "u-staff", name: "Sam Staff", email: "staff@sunrise.test", phone: null, role: "STAFF", status: "ACTIVE", tenantId: "1", tenant: tenantRef(), mustChangePassword: false },
  admin: { id: "u-admin", name: "Ada Admin", email: "admin@roost.test", phone: null, role: "PLATFORM_ADMIN", status: "ACTIVE", tenantId: null, tenant: null, mustChangePassword: false },
});

const makeProperties = () => [
  { id: "11", slug: "sunrise-central", name: "Sunrise Central", city: "Pune", state: "Maharashtra", address: "12 MG Road", price: 600, startingPrice: 600, bedsCount: 3, roomsCount: 1, status: "PUBLISHED", description: "Central co-living with a rooftop.", amenities: ["Fast Wi-Fi", "Hot water"] },
  { id: "12", slug: "sunrise-lake", name: "Sunrise Lake", city: "Mumbai", state: "Maharashtra", address: "Lake Road", price: 800, startingPrice: 800, bedsCount: 2, roomsCount: 1, status: "PUBLISHED", description: "Lakeside rooms.", amenities: ["Parking"] },
];

const makeRooms = () => ({
  11: [{ id: "101", propertyId: "11", roomNumber: "101", genderPolicy: "MIXED", hasAc: true, hasAttachedBathroom: false, basePrice: 600 }],
  12: [{ id: "201", propertyId: "12", roomNumber: "201", genderPolicy: "MIXED", hasAc: false, hasAttachedBathroom: true, basePrice: 800 }],
});

const makeBeds = () => ({
  101: [
    { id: "1001", roomId: "101", bedCode: "101-A", position: "LOWER", priceOverride: 600, status: "AVAILABLE" },
    { id: "1002", roomId: "101", bedCode: "101-B", position: "UPPER", priceOverride: 500, status: "BOOKED" },
    { id: "1003", roomId: "101", bedCode: "101-C", position: "SINGLE", priceOverride: 700, status: "MAINTENANCE" },
  ],
  201: [{ id: "2001", roomId: "201", bedCode: "201-A", position: "LOWER", priceOverride: 800, status: "AVAILABLE" }],
});

export class Backend {
  constructor() {
    this.users = makeUsers();
    this.properties = makeProperties();
    this.rooms = makeRooms();
    this.beds = makeBeds();
    this.tenant = { ...TENANT };
    this.tenantMode = "ok"; // ok | missing | suspended
    this.bookings = [
      { id: "b-seed", bookingCode: "ROOST-0001", status: "PENDING", guestId: "u-guest", guestName: "Gita Guest", guestEmail: "guest@sunrise.test", guestPhone: "9123456780", propertyId: "11", propertyName: "Sunrise Central", roomName: "Room 101", bedCode: "101-A", checkIn: dates.checkIn, checkOut: dates.checkOut, nights: 3, totalAmount: 1800, paymentStatus: "UNPAID", paymentMethod: "NOT_RECORDED" },
      { id: "b-conf", bookingCode: "ROOST-0002", status: "CONFIRMED", guestId: "u-guest", guestName: "Gita Guest", guestEmail: "guest@sunrise.test", guestPhone: "9123456780", propertyId: "12", propertyName: "Sunrise Lake", roomName: "Room 201", bedCode: "201-A", checkIn: dates.checkIn, checkOut: dates.checkOut, nights: 3, totalAmount: 2400, paymentStatus: "PAID", paymentMethod: "UPI" },
    ];
    this.guests = [{ id: "g1", name: "Walk In Wendy", email: "wendy@example.com", phone: "9000000001", status: "ACTIVE", profile: { address: "5 Park St", city: "Pune", idProofType: "AADHAAR" } }];
    this.payments = [{ id: "p1", paymentCode: "PAY-1", bookingId: "b-conf", bookingCode: "ROOST-0002", guestName: "Gita Guest", amount: 2400, method: "UPI", status: "PAID", date: new Date().toISOString() }];
    this.notifications = [];
    this.complaints = [{ id: "c1", complaintCode: "CMP-1", subject: "Broken fan", priority: "HIGH", status: "OPEN" }];
    this.myComplaints = [];
    this.managedUsers = [
      { id: "m1", name: "Mia Manager", email: "manager@sunrise.test", role: "MANAGER", status: "ACTIVE", tenantId: "1" },
      { id: "s1", name: "Sam Staff", email: "staff@sunrise.test", role: "STAFF", status: "ACTIVE", tenantId: "1" },
    ];
    this.inventory = [{ id: "i1", name: "Pillows", category: "RECURRING", currentStock: 3, minStockLevel: 10, unit: "PIECE", lowStock: true }];
    this.hotels = [
      { id: "1", slug: "sunrise", name: "Sunrise Hostel", status: "ACTIVE", loginUrl: "http://localhost:5199/sunrise/login", onboardingCompleted: true, owners: [{ name: "Omar Owner", email: "owner@sunrise.test", hasLogin: true, mustChangePassword: false }], counts: { properties: 2, beds: 4, bookings: 2, users: 5 } },
    ];
    this.settings = { GENERAL: { property_name: "Sunrise Hostel", check_in_time: "14:00", check_out_time: "11:00", tax_rate: "12" } };
    this.camera = { enabled: false, recordingEnabled: false, streamUrl: "" };
    this.requests = []; // every API call: { method, path, body, headers }
    this.unmocked = [];
    this.seq = 100;
  }

  /** Token a logged-in session of `role` carries. */
  tokenFor(role) { return `tok-${role}`; }

  userForToken(token) {
    const role = String(token || "").replace(/^Bearer tok-/, "");
    return this.users[role] || null;
  }

  calls(method, pathPrefix) {
    return this.requests.filter((r) => r.method === method && r.path.startsWith(pathPrefix));
  }

  availability(slug, query) {
    const property = this.properties.find((p) => p.slug === slug);
    if (!property) return null;
    const nights = nightsBetween(query.get("checkIn"), query.get("checkOut"));
    return {
      propertyId: property.id,
      propertyName: property.name,
      checkIn: query.get("checkIn"),
      checkOut: query.get("checkOut"),
      nights,
      rooms: (this.rooms[property.id] || []).map((room) => ({
        ...room,
        beds: (this.beds[room.id] || []).map((bed) => ({
          id: bed.id,
          bedCode: bed.bedCode,
          position: bed.position,
          status: bed.status,
          isBookable: bed.status === "AVAILABLE",
          effectivePrice: bed.priceOverride,
          totalForStay: bed.priceOverride * nights,
        })),
      })),
    };
  }

  /** Handles one API call. Returns { status, body } or null when the endpoint is not mocked. */
  handle({ method, path, query, body, headers }) {
    const auth = headers.authorization || "";
    const me = auth ? this.userForToken(auth) : null;
    const seg = path.split("/").filter(Boolean);
    const [a, b, c, d] = seg;
    const needUser = (...roles) => {
      if (!me) return fail(401, "Authentication required", "UNAUTHENTICATED");
      if (roles.length && !roles.includes(me.role)) return fail(403, "You do not have permission", "FORBIDDEN");
      return null;
    };

    // ── public / tenant ────────────────────────────────────────────────
    if (method === "GET" && a === "public" && b === "tenants") {
      if (this.tenantMode === "missing" || c !== this.tenant.slug) return fail(404, "Hotel not found", "TENANT_NOT_FOUND");
      if (this.tenantMode === "suspended") return fail(403, "This hotel is currently unavailable.", "TENANT_SUSPENDED");
      return ok(this.tenant);
    }
    if (a === "tenant" && b === "me" && !c) {
      const denied = needUser("OWNER"); if (denied) return denied;
      if (method === "GET") return ok(this.tenant);
      if (method === "PATCH") {
        const { displayName, completeOnboarding, address, ...rest } = body;
        Object.assign(this.tenant, rest, displayName ? { name: displayName } : {}, address ? { addressLine: address } : {});
        if (completeOnboarding) { this.users.owner.tenant.onboardingCompleted = true; this.users.newOwner.tenant.onboardingCompleted = true; }
        return ok(this.tenant);
      }
    }
    if (a === "tenant" && b === "me" && c === "logo" && method === "POST") return ok({ logoUrl: "https://example.test/logo.png" });

    // ── auth ───────────────────────────────────────────────────────────
    if (a === "auth") {
      if (method === "POST" && (b === "login" || (b === "admin" && c === "login"))) {
        const isAdminLogin = b === "admin";
        const user = Object.entries(this.users).find(([, u]) => u.email === String(body.email).toLowerCase())?.[0];
        if (!user || body.password !== PASSWORD || (isAdminLogin && user !== "admin")) return fail(401, "Invalid email or password", "INVALID_CREDENTIALS");
        return ok({ token: this.tokenFor(user), user: this.users[user] });
      }
      if (method === "POST" && b === "register") {
        if (Object.values(this.users).some((u) => u.email === body.email)) return fail(409, "An account with this email already exists", "EMAIL_TAKEN");
        this.users.newGuest = { id: "u-newguest", name: body.name, email: body.email, phone: body.phone || null, role: "GUEST", status: "ACTIVE", tenantId: "1", tenant: tenantRef(), mustChangePassword: false };
        return ok({ token: this.tokenFor("newGuest"), user: this.users.newGuest }, 201);
      }
      if (method === "GET" && b === "me") { const denied = needUser(); return denied || ok(me); }
      if (method === "PATCH" && b === "me") { const denied = needUser(); if (denied) return denied; Object.assign(me, body); return ok(me); }
      if (method === "POST" && b === "change-password") {
        const denied = needUser(); if (denied) return denied;
        if (body.oldPassword !== PASSWORD) return fail(400, "Old password is incorrect", "BAD_PASSWORD");
        return ok({ message: "Password changed successfully" });
      }
      if (method === "POST" && b === "forgot-password") return ok({ message: "If an account exists, a reset link has been sent" });
      if (method === "POST" && b === "password-updated") { if (me) me.mustChangePassword = false; return ok({}); }
    }

    // ── notifications ──────────────────────────────────────────────────
    if (a === "notifications") {
      const denied = needUser(); if (denied) return denied;
      if (method === "GET" && !b) return ok(this.notifications);
      if (method === "PATCH" && b === "read-all") { this.notifications.forEach((n) => { n.unread = false; }); return ok({ updated: this.notifications.length }); }
      if (method === "PATCH" && c === "read") { const n = this.notifications.find((x) => x.id === b); if (n) n.unread = false; return ok({ id: b, unread: false }); }
    }

    // ── properties / rooms / beds ──────────────────────────────────────
    if (a === "properties") {
      if (method === "GET" && !b) return ok({ items: query.get("city") ? this.properties.filter((p) => p.city === query.get("city")) : this.properties });
      if (method === "GET" && b === "mine") { const denied = needUser("OWNER", "STAFF", "MANAGER", "RECEPTIONIST"); return denied || ok({ items: this.properties }); }
      if (method === "POST" && !b) {
        const denied = needUser("OWNER"); if (denied) return denied;
        if (this.properties.some((p) => p.slug === body.slug)) return fail(409, "A property with this name already exists", "SLUG_TAKEN");
        const property = { id: String(++this.seq), price: 500, bedsCount: 0, roomsCount: 0, status: "PUBLISHED", ...body };
        this.properties.unshift(property);
        return ok(property, 201);
      }
      if (b && c === "rooms" && method === "GET") return ok(this.rooms[b] || []);
      if (b && c === "rooms" && method === "POST") {
        const denied = needUser("OWNER"); if (denied) return denied;
        if ((this.rooms[b] || []).some((r) => r.roomNumber === body.roomNumber)) return fail(409, "Room number already exists", "ROOM_EXISTS");
        const room = { id: String(++this.seq), propertyId: b, status: "ACTIVE", ...body };
        (this.rooms[b] ||= []).push(room);
        return ok(room, 201);
      }
      if (b && c === "availability" && method === "GET") { const r = this.availability(b, query); return r ? ok(r) : fail(404, "Property not found", "NOT_FOUND"); }
      if (b && !c && method === "GET") { const p = this.properties.find((x) => x.slug === b || x.id === b); return p ? ok(p) : fail(404, "Property not found", "NOT_FOUND"); }
      if (b && !c && method === "PATCH") { const p = this.properties.find((x) => x.id === b); Object.assign(p, body); return ok(p); }
      if (b && !c && method === "DELETE") { this.properties = this.properties.filter((x) => x.id !== b); return ok({}); }
    }
    if (a === "rooms" && c === "beds") {
      if (method === "GET") return ok(this.beds[b] || []);
      if (method === "POST") { const bed = { id: String(++this.seq), roomId: b, status: "AVAILABLE", ...body }; (this.beds[b] ||= []).push(bed); return ok(bed, 201); }
    }
    if (a === "beds" && b && method === "PATCH") {
      for (const list of Object.values(this.beds)) {
        const bed = list.find((x) => x.id === b);
        if (bed) { Object.assign(bed, body); return ok(bed); }
      }
      return fail(404, "Bed not found", "NOT_FOUND");
    }

    // ── bookings ───────────────────────────────────────────────────────
    if (a === "bookings") {
      if (method === "GET" && b === "owner") { const denied = needUser("OWNER", "STAFF", "MANAGER", "RECEPTIONIST"); return denied || ok({ items: this.bookings }); }
      if (method === "GET" && b === "mine") { const denied = needUser(); return denied || ok({ items: this.bookings.filter((x) => x.guestId === me.id) }); }
      if (method === "POST" && !b) {
        const bed = Object.values(this.beds).flat().find((x) => x.id === String(body.bedId));
        if (!bed) return fail(404, "Bed not found", "NOT_FOUND");
        if (bed.status !== "AVAILABLE") return fail(409, "This bed is no longer available for the selected dates", "BED_UNAVAILABLE");
        const property = this.properties.find((p) => p.id === String(body.propertyId));
        const nights = nightsBetween(body.checkIn, body.checkOut);
        bed.status = "BOOKED";
        const booking = {
          id: `b-${++this.seq}`, bookingCode: `ROOST-${String(1000 + this.seq)}`, status: "PENDING", guestId: me?.id || null,
          guestName: body.guestName, guestEmail: body.guestEmail, guestPhone: body.guestPhone, propertyId: body.propertyId,
          propertyName: property?.name, roomName: "Room 101", bedCode: bed.bedCode, checkIn: body.checkIn, checkOut: body.checkOut,
          nights, totalAmount: nights * bed.priceOverride, paymentStatus: "UNPAID", paymentMethod: "NOT_RECORDED",
        };
        this.bookings.unshift(booking);
        return ok(booking, 201);
      }
      const booking = this.bookings.find((x) => x.bookingCode === decodeURIComponent(b || ""));
      if (method === "GET" && b) return booking ? ok(booking) : fail(404, "Booking not found", "NOT_FOUND");
      if (method === "PATCH" && b && c) {
        if (!booking) return fail(404, "Booking not found", "NOT_FOUND");
        if (c === "cancel") {
          if (!me && body.guestEmail !== booking.guestEmail) return fail(403, "That email does not match this booking", "FORBIDDEN");
          booking.status = "CANCELLED";
        } else if (c === "approve" || c === "confirm") {
          const denied = needUser("OWNER", "STAFF", "MANAGER", "RECEPTIONIST"); if (denied) return denied;
          booking.status = "CONFIRMED";
        } else if (c === "reject") booking.status = "REJECTED";
        return ok(booking);
      }
    }

    // ── reception / finance ────────────────────────────────────────────
    if (a === "reception") {
      if (method === "GET" && b === "guests") {
        const search = (query.get("search") || "").toLowerCase();
        return ok(this.guests.filter((g) => !search || g.name.toLowerCase().includes(search)));
      }
      if (method === "POST" && b === "guests") {
        if (!/^[6-9]\d{9}$/.test(body.phone || "")) return fail(400, "Validation failed", "VALIDATION", { phone: "Invalid phone" });
        const guest = { id: `g${++this.seq}`, status: "ACTIVE", profile: {}, ...body }; this.guests.push(guest); return ok(guest, 201);
      }
      if (method === "GET" && b === "dashboard") return ok({ totalBeds: 24, occupiedBeds: 15, availableBeds: 9, currentGuests: 4, registeredGuests: 18, pendingBookings: 3, checkInsToday: 2, todayCollections: 5000 });
      if (method === "GET" && b === "properties" && d === "occupancy") {
        const beds = (this.rooms[c] || []).flatMap((room) => (this.beds[room.id] || []).map((bed) => ({
          id: bed.id, bedCode: bed.bedCode, roomId: room.id, roomNumber: room.roomNumber, hasAc: room.hasAc,
          status: bed.status === "BOOKED" ? "RESERVED" : bed.status, guestName: bed.status === "BOOKED" ? "Gita Guest" : null, bookingCode: bed.status === "BOOKED" ? "ROOST-0001" : null,
        })));
        const count = (status) => beds.filter((bed) => bed.status === status).length;
        return ok({ summary: { total: beds.length, occupied: count("OCCUPIED"), reserved: count("RESERVED"), available: count("AVAILABLE") }, beds });
      }
      if (method === "GET" && b === "bookings" && c) {
        const booking = this.bookings.find((x) => x.bookingCode === decodeURIComponent(c));
        if (!booking) return fail(404, "Booking not found for this property", "NOT_FOUND");
        return ok({ source: "WEB", paidAmount: 0, idProofType: null, idProofNumber: null, ...booking, canCheckIn: booking.status === "CONFIRMED" });
      }
      if (method === "POST" && b === "bookings") return ok({ bookingCode: `ROOST-${1000 + ++this.seq}`, status: "CONFIRMED" }, 201);
      if (method === "PATCH" && b === "bookings" && (d === "check-in" || d === "check-out")) {
        const booking = this.bookings.find((x) => x.bookingCode === c);
        if (!booking) return fail(404, "Booking not found", "NOT_FOUND");
        if (d === "check-in" && booking.status !== "CONFIRMED") return fail(409, "Only confirmed bookings can be checked in", "INVALID_STATE");
        booking.status = d === "check-in" ? "CHECKED_IN" : "COMPLETED";
        if (d === "check-in") { booking.idProofType = body.idProofType || null; booking.idProofNumber = body.idProofNumber || null; }
        return ok(booking);
      }
    }
    if (a === "finance") {
      if (method === "GET" && b === "payments") {
        const from = query.get("from"); const to = query.get("to"); const bookingId = query.get("bookingId");
        return ok(this.payments.filter((p) => (!bookingId || p.bookingId === bookingId) && (!from || new Date(p.date) >= new Date(from)) && (!to || new Date(p.date) < new Date(to))));
      }
      if (method === "POST" && b === "payments") {
        const booking = this.bookings.find((x) => x.id === String(body.bookingId));
        const parts = body.splits || [{ method: body.method, amount: body.amount }];
        const created = parts.map((part) => ({ id: `p${++this.seq}`, paymentCode: `PAY-${this.seq}`, status: "PAID", date: new Date().toISOString(), bookingId: body.bookingId, bookingCode: booking?.bookingCode, guestName: booking?.guestName, method: part.method, amount: Number(part.amount) }));
        this.payments.unshift(...created);
        if (booking) { const paid = this.payments.filter((p) => p.bookingId === booking.id).reduce((sum, p) => sum + p.amount, 0); booking.paymentStatus = paid >= booking.totalAmount ? "PAID" : "PARTIALLY_PAID"; }
        return ok(body.splits ? created : created[0], 201);
      }
      if (method === "GET" && b === "invoices") {
        if (c !== "INV-100") return fail(404, "Invoice not found", "NOT_FOUND");
        return ok({ invoiceNumber: "INV-100", bookingId: "b-conf", status: "PAID", issuedAt: new Date().toISOString(), subtotal: 2142, taxAmount: 258, totalAmount: 2400, guest: { name: "Gita Guest", email: "guest@sunrise.test", phone: "9123456780" } });
      }
      if (method === "POST" && b === "refunds") return ok({ id: "r1", status: "PENDING" }, 201);
    }

    // ── management / experience ────────────────────────────────────────
    if (a === "management") {
      if (b === "users" && method === "GET") return ok(query.get("role") ? this.managedUsers.filter((u) => u.role === query.get("role")) : this.managedUsers);
      if (b === "users" && method === "POST" && !c) { const user = { id: `m${++this.seq}`, status: "ACTIVE", tenantId: "1", ...body }; this.managedUsers.push(user); return ok(user, 201); }
      if (b === "users" && c && d === "reset-password" && method === "POST") {
        const user = this.managedUsers.find((u) => u.id === c);
        if (!user) return fail(404, "User not found", "NOT_FOUND");
        user.passwordResets = (user.passwordResets || 0) + 1;
        return ok({ id: c, passwordReset: true, temporaryPassword: `Temp-${user.passwordResets}-generated!a1` });
      }
      if (b === "users" && c && !d && method === "DELETE") {
        const user = this.managedUsers.find((u) => u.id === c);
        if (!user) return fail(404, "User not found", "NOT_FOUND");
        if (user.hasHistory) return fail(409, "This account has recorded activity (bookings, payments or check-ins) and cannot be deleted. Suspend it instead.", "USER_HAS_HISTORY");
        this.managedUsers = this.managedUsers.filter((u) => u.id !== c);
        return ok({ id: c, deleted: true });
      }
      if (b === "users" && c && d === "status") { const user = this.managedUsers.find((u) => u.id === c); user.status = body.status; return ok(user); }
      if (b === "inventory" && method === "GET") return ok(this.inventory);
      if (b === "inventory" && method === "POST") { const item = { id: `i${++this.seq}`, currentStock: Number(body.openingStock), lowStock: false, ...body }; this.inventory.push(item); return ok(item, 201); }
    }
    if (a === "experience") {
      if (b === "feedback" && !c && method === "GET") return ok([{ id: "f1", guestName: "Gita Guest", bookingCode: "ROOST-0002", overallRating: 4, cleanlinessRating: 3, serviceRating: 5, valueRating: 2, comment: "Lovely stay", createdAt: new Date().toISOString() }]);
      if (b === "feedback" && c === "analysis") return ok({ averages: { overall: 4.5, cleanliness: 4.2 } });
      if (b === "feedback" && method === "POST") return ok({ id: "f1" }, 201);
      if (b === "complaints" && c === "mine") return ok(this.myComplaints);
      if (b === "complaints" && method === "GET") return ok(this.complaints);
      if (b === "complaints" && method === "POST") { const complaint = { id: `c${++this.seq}`, complaintCode: `CMP-${this.seq}`, status: "OPEN", ...body }; this.myComplaints.unshift(complaint); return ok(complaint, 201); }
      if (b === "complaints" && c && method === "PATCH") { const complaint = this.complaints.find((x) => x.id === c); Object.assign(complaint, body); return ok(complaint); }
    }

    // ── analytics / reports / system ───────────────────────────────────
    if (a === "analytics") {
      if (b === "owner-summary") return ok({ stats: [{ label: "Occupancy", value: "62%" }, { label: "Revenue", value: "₹48,000" }], occupancy: [10, 20, 30], occupancyLabels: ["Mon", "Tue", "Wed"] });
      if (b === "dashboard") return ok({ totalBeds: 24, availableBeds: 9, pendingBookings: 3, revenue: 125000, occupiedBeds: 15, pendingPayments: 2, totalGuests: 18 });
    }
    if (a === "reports") {
      if (b === "occupancy") return ok([{ status: "AVAILABLE", count: 9 }, { status: "BOOKED", count: 15 }]);
      if (b === "revenue") return ok({ byMethod: [{ method: "UPI", payments: 4, amount: 9600 }] });
      if (b === "staff-performance") return ok([{ userId: "u-owner", action: "BOOKING_APPROVED", count: 7 }]);
      if (b === "bi" && c === "weekly") return ok({ periodDays: 7, bookings: 12, revenue: 30000, averageFeedback: 4.4 });
      if (b === "bi" && c === "monthly") return ok({ periodDays: 30, bookings: 50, revenue: 120000, averageFeedback: 4.6 });
    }
    if (a === "system") {
      if (b === "access-control") return ok({ permissions: { OWNER: ["bookings:read", "bookings:approve"], MANAGER: ["inventory:read"] } });
      if (b === "settings" && method === "GET") return ok(this.settings);
      if (b === "settings" && method === "PATCH") { for (const s of body.settings) this.settings.GENERAL[s.key] = s.value; return ok(this.settings); }
      if (b === "camera" && method === "GET") return ok(this.camera);
      if (b === "camera" && method === "PUT") { Object.assign(this.camera, body); return ok(this.camera); }
      if (b === "backup") return ok({ backupEnabled: true, backupFrequency: "DAILY", lastBackupAt: new Date().toISOString() });
      if (b === "restore") return ok({ requested: true });
      if (b === "audit-logs") return ok({ data: [{ id: "a1", createdAt: new Date().toISOString(), action: "BOOKING_APPROVED", entityType: "Booking", entityId: "b-seed", userId: "u-owner" }] });
    }

    // ── platform admin ─────────────────────────────────────────────────
    if (a === "platform" && b === "tenants") {
      const denied = needUser("PLATFORM_ADMIN", "ADMIN"); if (denied) return denied;
      if (method === "GET" && !c) return ok(this.hotels);
      if (method === "POST" && !c) {
        if (this.hotels.some((h) => h.slug === body.slug)) return fail(409, "That URL address is already taken", "SLUG_TAKEN");
        const hotel = { id: String(++this.seq), slug: body.slug, name: body.displayName, status: "ACTIVE", loginUrl: `http://localhost:5199/${body.slug}/login`, onboardingCompleted: false, owners: [{ name: body.ownerName, email: body.ownerEmail, hasLogin: body.accessMode === "password", mustChangePassword: body.accessMode === "password" }], counts: { properties: 0, beds: 0, bookings: 0, users: 1 } };
        this.hotels.push(hotel);
        return ok({ tenant: { name: hotel.name }, loginUrl: hotel.loginUrl, ownerEmail: body.ownerEmail, delivery: body.accessMode === "password" ? "PASSWORD" : "INVITE_EMAIL", temporaryPassword: body.accessMode === "password" ? body.temporaryPassword : undefined }, 201);
      }
      if (method === "PATCH" && c && !d) { const hotel = this.hotels.find((h) => h.id === c); Object.assign(hotel, body); return ok(hotel); }
      if (method === "POST" && c && d === "owner-access") return ok({ loginUrl: "http://localhost:5199/sunrise/login", ownerEmail: "owner@sunrise.test", delivery: body.accessMode === "password" ? "PASSWORD" : "INVITE_EMAIL", temporaryPassword: body.temporaryPassword });
    }

    return null;
  }
}

/** Routes every /api/v1 call from `page` into `backend`. */
export async function attachBackend(page, backend) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api\/v1/, "");
    const headers = request.headers();
    let body = {};
    try { body = request.postDataJSON() || {}; } catch { body = {}; }
    const call = { method: request.method(), path, body, headers, query: url.searchParams };
    backend.requests.push(call);
    const result = backend.handle(call);
    if (!result) {
      backend.unmocked.push(`${call.method} ${path}`);
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ success: false, message: `Unmocked endpoint ${call.method} ${path}` }) });
    }
    return route.fulfill({ status: result.status, contentType: "application/json", body: JSON.stringify(result.body) });
  });
}
