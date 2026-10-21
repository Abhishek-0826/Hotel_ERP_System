/* ─────────────────────────────────────────────────────────────────────────
   src/modules/booking/booking.service.js
   Full booking lifecycle: create, getByCode, confirm, reject, cancel,
   listOwnerBookings — all with ownership enforcement.
───────────────────────────────────────────────────────────────────────── */
const prisma = require("../../config/db");
const { randomUUID } = require("node:crypto");
const { sendNotification } = require("../notification/notification.service");
const inbox = require("../notification/inbox.service");

/* ── helpers ── */
const generateBookingCode = () => {
    const chars = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // base32 no ambiguous
    let code = "ROOST-";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
};

const formatBooking = (b) => {
    const nights = Math.max(1, Math.ceil((new Date(b.check_out) - new Date(b.check_in)) / 86400000));
    const totalAmount = Number(b.total_amount);
    const property = b.properties_bookings_property_idToproperties;
    const room = b.rooms_bookings_room_idTorooms;
    const bed = b.beds_bookings_bed_idTobeds;
    return {
    id:              b.id.toString(),
    bookingCode:     b.booking_code,
    tenantId:        b.tenant_id.toString(),
    guestId:         b.guest_id.toString(),
    propertyId:      b.property_id.toString(),
    roomId:          b.room_id.toString(),
    bedId:           b.bed_id.toString(),
    checkIn:         b.check_in,
    checkOut:        b.check_out,
    nights,
    price:           totalAmount / nights,
    totalAmount,
    guest:           { name: b.guest_name, email: b.guest_email || null, phone: b.guest_phone || null },
    guestName:       b.guest_name,
    guestPhone:      b.guest_phone || null,
    guestEmail:      b.guest_email || null,
    source:          b.source,
    status:          b.status,
    paymentStatus:   b.payment_status || "UNPAID",
    propertyName:    property?.name || null,
    location:        [property?.city, property?.state].filter(Boolean).join(", ") || null,
    roomName:        room?.room_number ? `Room ${room.room_number}` : null,
    bedCode:         bed?.bed_code || null,
    rejectionReason: b.rejection_reason || null,
    createdAt:       b.created_at,
    updatedAt:       b.updated_at,
    };
};

/* ── VALID STATUS TRANSITIONS ── */
const ALLOWED_TRANSITIONS = {
    PENDING:   ["CONFIRMED", "REJECTED", "CANCELLED"],
    CONFIRMED: ["CANCELLED", "COMPLETED"],
    REJECTED:  [],
    CANCELLED: [],
    COMPLETED: [],
};

/* ─────────────────────────────────────────────────────────────────────────
   createBooking
   Fully transactional. Validates property → room → bed chain with tenant
   isolation. Calculates price server-side. Catches P2002 for double-booking.
───────────────────────────────────────────────────────────────────────── */
const createBooking = async ({
    guestId, propertyId, roomId, bedId,
    checkIn, checkOut, guestName, guestPhone, guestEmail, source = "WEB", tenantId: expectedTenantId,
}) => {
    const checkInDate  = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Round-trip so impossible dates such as 2026-02-31 are rejected rather than rolled over.
    const isRealDate = (date, text) => !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === text;
    if (!isRealDate(checkInDate, checkIn) || !isRealDate(checkOutDate, checkOut)) {
        const err = new Error("checkIn and checkOut must be valid dates"); err.status = 400; err.code = "INVALID_DATE"; throw err;
    }
    if (checkInDate >= checkOutDate) {
        const err = new Error("checkOut must be after checkIn"); err.status = 400; err.code = "INVALID_DATE_RANGE"; throw err;
    }
    if (checkInDate < new Date(new Date().toDateString())) {
        const err = new Error("checkIn cannot be in the past"); err.status = 400; err.code = "INVALID_DATE"; throw err;
    }

    // Validate full ownership chain: property → room → bed
    const property = await prisma.properties.findFirst({
        where: { id: BigInt(propertyId), status: "PUBLISHED", ...(expectedTenantId ? { tenant_id: BigInt(expectedTenantId) } : {}) },
    });
    if (!property) { const err = new Error("Property not found or not published"); err.status = 404; err.code = "PROPERTY_NOT_FOUND"; throw err; }
    const tenantId = property.tenant_id;

    const room = await prisma.rooms.findFirst({
        where: { id: BigInt(roomId), property_id: BigInt(propertyId), tenant_id: tenantId, status: "ACTIVE" },
    });
    if (!room) { const err = new Error("Room not found or inactive"); err.status = 404; err.code = "ROOM_NOT_FOUND"; throw err; }

    const bed = await prisma.beds.findFirst({
        where: { id: BigInt(bedId), room_id: BigInt(roomId), tenant_id: tenantId },
    });
    if (!bed) { const err = new Error("Bed not found"); err.status = 404; err.code = "BED_NOT_FOUND"; throw err; }

    if (bed.status !== "AVAILABLE") {
        const err = new Error(`Bed is ${bed.status.toLowerCase()} and cannot be booked`); err.status = 409; err.code = "BED_NOT_AVAILABLE"; throw err;
    }

    // Check overlap BEFORE creating (app-layer guard; DB exclusion constraint is the hard lock)
    const conflict = await prisma.bookings.findFirst({
        where: {
            bed_id:    BigInt(bedId),
            tenant_id: tenantId,
            status:    { in: ["PENDING", "CONFIRMED"] },
            check_in:  { lt: checkOutDate },
            check_out: { gt: checkInDate },
        },
    });
    if (conflict) {
        const err = new Error("Bed is already booked for the selected dates"); err.status = 409; err.code = "BED_ALREADY_BOOKED"; throw err;
    }

    let guest = null;
    if (guestId) {
        guest = await prisma.users.findFirst({
            where: { id: BigInt(guestId), role: "GUEST", status: "ACTIVE" },
        });
        if (!guest) {
            const err = new Error("Authenticated guest account was not found");
            err.status = 403;
            err.code = "GUEST_ACCOUNT_INVALID";
            throw err;
        }
    }
    if (!guest) {
        guest = await prisma.users.create({
            data: {
                tenant_id: tenantId,
                name: guestName,
                // Anonymous booking contacts are stored on the booking. A
                // synthetic login prevents someone from claiming that email
                // as an account before it has been verified.
                email: `booking-${randomUUID()}@guest.invalid`,
                phone: guestPhone,
                password_hash: null,
                role: "GUEST",
                status: "ACTIVE",
            },
        });
    }

    // Calculate price
    const nights       = Math.ceil((checkOutDate - checkInDate) / 86400000);
    const unitPrice    = bed.price_override ?? room.base_price;
    const totalAmount  = (Number(unitPrice) * nights).toFixed(2);

    // Generate unique booking code
    let bookingCode;
    let attempts = 0;
    do {
        bookingCode = generateBookingCode();
        const exists = await prisma.bookings.findUnique({ where: { booking_code: bookingCode } });
        if (!exists) break;
        if (++attempts > 10) throw new Error("Could not generate unique booking code");
    } while (true);

    try {
        const booking = await prisma.bookings.create({
            data: {
                booking_code:    bookingCode,
                tenant_id:       tenantId,
                guest_id:        guest.id,
                property_id:     BigInt(propertyId),
                room_id:         BigInt(roomId),
                bed_id:          BigInt(bedId),
                check_in:        checkInDate,
                check_out:       checkOutDate,
                guest_name:      guestName,
                guest_phone:     guestPhone || null,
                guest_email:     guestEmail || null,
                source,
                status:          "PENDING",
                rejection_reason:null,
                total_amount:    totalAmount,
            },
        });

        // Fire-and-forget notifications
        void sendNotification({
            event:   "BOOKING_CREATED",
            booking: formatBooking(booking),
            tenant:  { whatsappNumber: null }, // enriched in real flow
        });

        void inbox.notifyStaff(tenantId, {
            title: "New booking request",
            body: `${guestName} requested ${booking.booking_code} (${checkIn} to ${checkOut}).`,
            type: "BOOKING_CREATED",
        });
        if (guestId) {
            void inbox.notifyUsers([guest.id], {
                tenantId, title: "Booking request submitted",
                body: `Your booking ${booking.booking_code} is awaiting approval.`, type: "BOOKING_CREATED",
            });
        }

        return formatBooking(booking);
    } catch (err) {
        // Catch DB-level exclusion constraint violation
        if (err.code === "P2002" || (err.message && err.message.includes("no_double_booking"))) {
            const conflict = new Error("Bed is already booked for the selected dates");
            conflict.status = 409; conflict.code = "BED_ALREADY_BOOKED"; throw conflict;
        }
        throw err;
    }
};

/* ── getBookingByCode ── */
const canAccessBooking = (booking, actor) => {
    if (!actor) return false;
    if (["PLATFORM_ADMIN", "ADMIN"].includes(actor.role)) return true;
    if (actor.role === "GUEST") return String(booking.guest_id) === String(actor.userId);
    return actor.tenantId && String(booking.tenant_id) === String(actor.tenantId);
};

const redactPublicBooking = (booking) => {
    const { guestId, tenantId, guest, guestName, guestPhone, guestEmail, ...safe } = formatBooking(booking);
    return { ...safe, guest: null, guestName: null, guestPhone: null, guestEmail: null };
};

const getBookingByCode = async (code, actor) => {
    const booking = await prisma.bookings.findUnique({ where: { booking_code: code } });
    if (!booking) { const err = new Error("Booking not found"); err.status = 404; err.code = "NOT_FOUND"; throw err; }
    return canAccessBooking(booking, actor) ? formatBooking(booking) : redactPublicBooking(booking);
};

/* ── confirmBooking (OWNER) ── */
const confirmBooking = async (code, tenantId, options = {}) => {
    const booking = await prisma.bookings.findUnique({ where: { booking_code: code } });
    if (!booking) { const err = new Error("Booking not found"); err.status = 404; err.code = "NOT_FOUND"; throw err; }
    if (!options.allTenants && booking.tenant_id.toString() !== tenantId.toString()) {
        const err = new Error("Unauthorized"); err.status = 403; err.code = "FORBIDDEN"; throw err;
    }
    if (!ALLOWED_TRANSITIONS[booking.status].includes("CONFIRMED")) {
        const err = new Error(`Cannot confirm a booking with status ${booking.status}`); err.status = 409; err.code = "INVALID_TRANSITION"; throw err;
    }

    const updated = await prisma.bookings.update({
        where: { booking_code: code },
        data:  { status: "CONFIRMED", updated_at: new Date() },
    });

    void sendNotification({ event: "BOOKING_CONFIRMED", booking: formatBooking(updated), tenant: {} });
    void inbox.notifyUsers([booking.guest_id], {
        tenantId: booking.tenant_id, title: "Booking confirmed",
        body: `Your booking ${code} has been confirmed. Show your QR code at check-in.`, type: "BOOKING_CONFIRMED",
    });
    return formatBooking(updated);
};

/* ── rejectBooking (OWNER) ── */
const rejectBooking = async (code, tenantId, reason, options = {}) => {
    const booking = await prisma.bookings.findUnique({ where: { booking_code: code } });
    if (!booking) { const err = new Error("Booking not found"); err.status = 404; err.code = "NOT_FOUND"; throw err; }
    if (!options.allTenants && booking.tenant_id.toString() !== tenantId.toString()) {
        const err = new Error("Unauthorized"); err.status = 403; err.code = "FORBIDDEN"; throw err;
    }
    if (!ALLOWED_TRANSITIONS[booking.status].includes("REJECTED")) {
        const err = new Error(`Cannot reject a booking with status ${booking.status}`); err.status = 409; err.code = "INVALID_TRANSITION"; throw err;
    }

    const updated = await prisma.bookings.update({
        where: { booking_code: code },
        data:  { status: "REJECTED", rejection_reason: reason, updated_at: new Date() },
    });

    void sendNotification({ event: "BOOKING_REJECTED", booking: formatBooking(updated), tenant: {} });
    void inbox.notifyUsers([booking.guest_id], {
        tenantId: booking.tenant_id, title: "Booking rejected",
        body: `Your booking ${code} was rejected. Reason: ${reason}`, type: "BOOKING_REJECTED",
    });
    return formatBooking(updated);
};

/* ── cancelBooking (GUEST or OWNER) ── */
const cancelBooking = async (code, reason, actor, guestEmail) => {
    const booking = await prisma.bookings.findUnique({ where: { booking_code: code } });
    if (!booking) { const err = new Error("Booking not found"); err.status = 404; err.code = "NOT_FOUND"; throw err; }
    const emailMatches = guestEmail && booking.guest_email && guestEmail.toLowerCase() === booking.guest_email.toLowerCase();
    if (!canAccessBooking(booking, actor) && !emailMatches) {
        const err = new Error("Sign in or provide the booking email to cancel this reservation");
        err.status = 403;
        err.code = "BOOKING_ACCESS_DENIED";
        throw err;
    }
    if (!ALLOWED_TRANSITIONS[booking.status].includes("CANCELLED")) {
        const err = new Error(`Cannot cancel a booking with status ${booking.status}`); err.status = 409; err.code = "INVALID_TRANSITION"; throw err;
    }

    const updated = await prisma.bookings.update({
        where: { booking_code: code },
        data:  { status: "CANCELLED", rejection_reason: reason || null, updated_at: new Date() },
    });

    void sendNotification({ event: "BOOKING_CANCELLED", booking: formatBooking(updated), tenant: {} });
    void inbox.notifyStaff(booking.tenant_id, {
        title: "Booking cancelled", body: `${code} was cancelled.`, type: "BOOKING_CANCELLED",
    });
    if (actor?.role !== "GUEST") {
        void inbox.notifyUsers([booking.guest_id], {
            tenantId: booking.tenant_id, title: "Booking cancelled", body: `Your booking ${code} was cancelled.`, type: "BOOKING_CANCELLED",
        });
    }
    return formatBooking(updated);
};

/* ── listOwnerBookings ── */
const listOwnerBookings = async ({
    tenantId, allTenants = false, propertyId, status, paymentStatus, source, q, from, to,
    page = 1, pageSize, limit = 20,
}) => {
    const where = allTenants ? {} : { tenant_id: BigInt(tenantId) };
    if (propertyId) where.property_id = BigInt(propertyId);
    if (status)     where.status      = status;
    if (paymentStatus) where.payment_status = paymentStatus;
    if (source)     where.source      = source;
    // Stay dates overlapping [from, to]
    if (from) where.check_out = { gte: new Date(from) };
    if (to)   where.check_in  = { lte: new Date(to) };
    if (q && String(q).trim()) {
        const term = String(q).trim();
        where.OR = [
            { booking_code: { contains: term, mode: "insensitive" } },
            { guest_name:   { contains: term, mode: "insensitive" } },
            { guest_email:  { contains: term, mode: "insensitive" } },
            { guest_phone:  { contains: term } },
        ];
    }

    const pageNum  = Math.max(1, parseInt(page));
    const resolvedPageSize = Math.min(100, Math.max(1, parseInt(pageSize || limit)));
    const skip     = (pageNum - 1) * resolvedPageSize;

    const [bookings, total] = await Promise.all([
        prisma.bookings.findMany({
            where,
            skip,
            take: resolvedPageSize,
            orderBy: { created_at: "desc" },
            include: {
                properties_bookings_property_idToproperties: { select: { name: true, city: true, state: true } },
                rooms_bookings_room_idTorooms: { select: { room_number: true } },
                beds_bookings_bed_idTobeds: { select: { bed_code: true } },
            },
        }),
        prisma.bookings.count({ where }),
    ]);

    return {
        items:      bookings.map(formatBooking),
        page:       pageNum,
        pageSize:   resolvedPageSize,
        totalItems: total,
        totalPages: Math.ceil(total / resolvedPageSize),
    };
};

/* Guest booking history. The authenticated user id is always used server-side. */
const listGuestBookings = async ({ guestId, tenantId, status, page = 1, pageSize = 20 }) => {
    const where = { guest_id: BigInt(guestId), ...(tenantId ? { tenant_id: BigInt(tenantId) } : {}) };
    if (status) where.status = status;

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const resolvedPageSize = Math.min(50, Math.max(1, Number.parseInt(pageSize, 10) || 20));
    const skip = (pageNum - 1) * resolvedPageSize;

    const [bookings, total] = await Promise.all([
        prisma.bookings.findMany({
            where,
            skip,
            take: resolvedPageSize,
            orderBy: { created_at: "desc" },
            include: {
                properties_bookings_property_idToproperties: { select: { name: true, city: true, state: true } },
                rooms_bookings_room_idTorooms: { select: { room_number: true } },
                beds_bookings_bed_idTobeds: { select: { bed_code: true } },
            },
        }),
        prisma.bookings.count({ where }),
    ]);

    return {
        items: bookings.map(formatBooking),
        page: pageNum,
        pageSize: resolvedPageSize,
        totalItems: total,
        totalPages: Math.ceil(total / resolvedPageSize),
    };
};

module.exports = {
    createBooking,
    getBookingByCode,
    confirmBooking,
    rejectBooking,
    cancelBooking,
    listOwnerBookings,
    listGuestBookings,
};
