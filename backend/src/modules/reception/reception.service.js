const crypto = require("crypto");
const prisma = require("../../config/db");
const { recordAudit } = require("../../common/audit.service");
const inbox = require("../notification/inbox.service");

const fail = (message, status, code) => {
  const error = new Error(message); error.status = status; error.code = code; throw error;
};
const code = (prefix) => `${prefix}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
const formatGuest = (user) => ({
  id: user.id.toString(), name: user.name, email: user.email, phone: user.phone || null, status: user.status,
  profile: user.guest_profiles?.[0] ? {
    idProofType: user.guest_profiles[0].id_proof_type, idProofNumber: user.guest_profiles[0].id_proof_number,
    address: user.guest_profiles[0].address, city: user.guest_profiles[0].city, state: user.guest_profiles[0].state,
    gender: user.guest_profiles[0].gender, notes: user.guest_profiles[0].notes,
  } : null,
});
const formatBooking = (booking) => ({
  id: booking.id.toString(), bookingCode: booking.booking_code, guestId: booking.guest_id.toString(), propertyId: booking.property_id.toString(),
  roomId: booking.room_id.toString(), bedId: booking.bed_id.toString(), checkIn: booking.check_in, checkOut: booking.check_out,
  actualCheckIn: booking.actual_check_in, actualCheckOut: booking.actual_check_out, status: booking.status,
  paymentStatus: booking.payment_status, totalAmount: booking.total_amount.toString(),
});

const registerGuest = async (tenantId, data, actor, req) => {
  const tenant = BigInt(tenantId);
  const existing = data.email ? await prisma.users.findUnique({ where: { email: data.email } }) : await prisma.users.findFirst({ where: { tenant_id: tenant, phone: data.phone, role: "GUEST" } });
  if (existing && (existing.tenant_id?.toString() !== String(tenantId) || existing.role !== "GUEST")) fail("Email or phone is already associated with another account", 409, "GUEST_EXISTS");
  const user = await prisma.$transaction(async (tx) => {
    const guest = existing ? await tx.users.update({ where: { id: existing.id }, data: { name: data.name, phone: data.phone, updated_at: new Date() } }) : await tx.users.create({
      data: { tenant_id: tenant, name: data.name, email: data.email || `guest-${crypto.randomUUID()}@roost.invalid`, phone: data.phone, password_hash: null, role: "GUEST", status: "ACTIVE" },
    });
    const profileData = {
      id_proof_type: data.idProofType || null, id_proof_number: data.idProofNumber || null, address: data.address || null, city: data.city || null,
      state: data.state || null, gender: data.gender || null, date_of_birth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      emergency_contact_name: data.emergencyContactName || null, emergency_contact_phone: data.emergencyContactPhone || null, notes: data.notes || null, updated_at: new Date(),
    };
    const profile = await tx.guest_profiles.findFirst({ where: { tenant_id: tenant, user_id: guest.id } });
    if (profile) await tx.guest_profiles.update({ where: { id: profile.id }, data: profileData });
    else await tx.guest_profiles.create({ data: { tenant_id: tenant, user_id: guest.id, ...profileData } });
    await recordAudit({ tenantId, userId: actor.userId, action: existing ? "GUEST_UPDATED" : "GUEST_REGISTERED", entityType: "GUEST", entityId: guest.id, newValues: { name: guest.name, phone: guest.phone }, req, client: tx });
    return tx.users.findUnique({ where: { id: guest.id }, include: { guest_profiles: true } });
  });
  return formatGuest(user);
};

const searchGuests = async (tenantId, search = "") => {
  const guests = await prisma.users.findMany({
    where: { tenant_id: BigInt(tenantId), role: "GUEST", OR: search ? [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] : undefined },
    include: { guest_profiles: true }, orderBy: { created_at: "desc" }, take: 50,
  });
  return guests.map(formatGuest);
};

const getAvailability = async (tenantId, propertyId, checkIn, checkOut) => {
  const from = new Date(checkIn); const until = new Date(checkOut);
  if (Number.isNaN(from.valueOf()) || Number.isNaN(until.valueOf()) || from >= until) fail("A valid check-in and check-out range is required", 400, "INVALID_DATE_RANGE");
  const rooms = await prisma.rooms.findMany({ where: { tenant_id: BigInt(tenantId), property_id: BigInt(propertyId), status: "ACTIVE" }, include: { beds_beds_room_idTorooms: true }, orderBy: { room_number: "asc" } });
  const blocked = await prisma.bookings.findMany({ where: { tenant_id: BigInt(tenantId), property_id: BigInt(propertyId), status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }, check_in: { lt: until }, check_out: { gt: from } }, select: { bed_id: true } });
  const blockedIds = new Set(blocked.map((booking) => booking.bed_id.toString()));
  return rooms.map((room) => ({ id: room.id.toString(), roomNumber: room.room_number, hasAc: room.has_ac, beds: room.beds_beds_room_idTorooms.map((bed) => ({ id: bed.id.toString(), bedCode: bed.bed_code, status: blockedIds.has(bed.id.toString()) ? "BOOKED" : bed.status, isAvailable: bed.status === "AVAILABLE" && !blockedIds.has(bed.id.toString()) })) }));
};

const createBooking = async (tenantId, data, actor, req) => {
  const from = new Date(data.checkIn); const until = new Date(data.checkOut);
  // Round-trip so impossible dates such as 2026-02-31 are rejected rather than rolled over.
  const isRealDate = (date, text) => !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === text;
  if (!isRealDate(from, data.checkIn) || !isRealDate(until, data.checkOut)) fail("checkIn and checkOut must be valid dates", 400, "INVALID_DATE");
  if (from >= until) fail("checkOut must be after checkIn", 400, "INVALID_DATE_RANGE");
  if (from < new Date(new Date().toDateString())) fail("checkIn cannot be in the past", 400, "INVALID_DATE");
  const tenant = BigInt(tenantId);
  const booking = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM beds WHERE id = ${BigInt(data.bedId)} FOR UPDATE`;
    const [guest, room, bed] = await Promise.all([
      tx.users.findFirst({ where: { id: BigInt(data.guestId), tenant_id: tenant, role: "GUEST", status: "ACTIVE" } }),
      tx.rooms.findFirst({ where: { id: BigInt(data.roomId), property_id: BigInt(data.propertyId), tenant_id: tenant, status: "ACTIVE" } }),
      tx.beds.findFirst({ where: { id: BigInt(data.bedId), room_id: BigInt(data.roomId), tenant_id: tenant } }),
    ]);
    if (!guest) fail("Guest not found", 404, "GUEST_NOT_FOUND");
    if (!room || !bed) fail("Room or bed not found", 404, "BED_NOT_FOUND");
    if (bed.status !== "AVAILABLE") fail("Bed is not available for allocation", 409, "BED_NOT_AVAILABLE");
    const conflict = await tx.bookings.findFirst({ where: { tenant_id: tenant, bed_id: bed.id, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }, check_in: { lt: until }, check_out: { gt: from } } });
    if (conflict) fail("Bed is already booked for the selected dates", 409, "BED_ALREADY_BOOKED");
    const nights = Math.ceil((until - from) / 86400000);
    const totalAmount = (Number(bed.price_override ?? room.base_price) * nights).toFixed(2);
    const created = await tx.bookings.create({ data: { booking_code: code("ROOST"), tenant_id: tenant, guest_id: guest.id, property_id: BigInt(data.propertyId), room_id: room.id, bed_id: bed.id, check_in: from, check_out: until, guest_name: guest.name, guest_phone: guest.phone, guest_email: guest.email.endsWith("@roost.invalid") ? null : guest.email, source: data.source, status: "CONFIRMED", total_amount: totalAmount, payment_status: "UNPAID" } });
    await recordAudit({ tenantId, userId: actor.userId, action: "BOOKING_CREATED", entityType: "BOOKING", entityId: created.id, newValues: { bookingCode: created.booking_code, bedId: data.bedId }, req, client: tx });
    return created;
  }, { isolationLevel: "Serializable" }).catch((error) => {
    if (error.code === "P2002" || error.code === "P2034" || error.message?.includes("no_double_booking")) fail("Bed is already booked for the selected dates", 409, "BED_ALREADY_BOOKED");
    throw error;
  });
  return formatBooking(booking);
};

const bookingInclude = {
  properties_bookings_property_idToproperties: { select: { name: true, city: true, state: true } },
  rooms_bookings_room_idTorooms: { select: { room_number: true } },
  beds_bookings_bed_idTobeds: { select: { bed_code: true } },
  users: { include: { guest_profiles: true } },
};

// Everything the front desk needs to pre-fill the check-in form from a scanned booking code.
const getBookingForCheckIn = async (tenantId, bookingCode) => {
  const booking = await prisma.bookings.findFirst({ where: { booking_code: bookingCode, tenant_id: BigInt(tenantId) }, include: bookingInclude });
  if (!booking) fail("Booking not found for this property", 404, "NOT_FOUND");
  const profile = booking.users?.guest_profiles?.find((item) => String(item.tenant_id) === String(tenantId)) || booking.users?.guest_profiles?.[0] || null;
  const paid = await prisma.payments.aggregate({ where: { booking_id: booking.id, status: "PAID" }, _sum: { amount: true } });
  const property = booking.properties_bookings_property_idToproperties;
  return {
    ...formatBooking(booking),
    guestName: booking.guest_name, guestPhone: booking.guest_phone, guestEmail: booking.guest_email,
    propertyName: property?.name || null,
    location: [property?.city, property?.state].filter(Boolean).join(", ") || null,
    roomName: booking.rooms_bookings_room_idTorooms?.room_number ? `Room ${booking.rooms_bookings_room_idTorooms.room_number}` : null,
    bedCode: booking.beds_bookings_bed_idTobeds?.bed_code || null,
    paidAmount: Number(paid._sum.amount || 0),
    idProofType: profile?.id_proof_type || null,
    idProofNumber: profile?.id_proof_number || null,
    canCheckIn: booking.status === "CONFIRMED",
  };
};

const checkIn = async (tenantId, bookingCode, data = {}, actor, req) => {
  const booking = await prisma.$transaction(async (tx) => {
    const current = await tx.bookings.findFirst({ where: { booking_code: bookingCode, tenant_id: BigInt(tenantId) } });
    if (!current) fail("Booking not found", 404, "NOT_FOUND");
    if (current.status === "PENDING") fail("This booking is still awaiting approval. Approve it before checking the guest in.", 409, "INVALID_TRANSITION");
    if (current.status !== "CONFIRMED") fail(`Only confirmed bookings can be checked in (this one is ${current.status.toLowerCase().replace("_", " ")})`, 409, "INVALID_TRANSITION");
    const bedUpdated = await tx.beds.updateMany({ where: { id: current.bed_id, tenant_id: BigInt(tenantId), status: "AVAILABLE" }, data: { status: "OCCUPIED", updated_at: new Date() } });
    if (bedUpdated.count !== 1) fail("Bed is no longer available", 409, "BED_NOT_AVAILABLE");
    const updated = await tx.bookings.update({ where: { id: current.id }, data: { status: "CHECKED_IN", actual_check_in: new Date(), checked_in_by: BigInt(actor.userId), updated_at: new Date() } });
    if (data.idProofType && data.idProofNumber) {
      const tenant = BigInt(tenantId);
      const profile = await tx.guest_profiles.findFirst({ where: { tenant_id: tenant, user_id: current.guest_id } });
      const idData = { id_proof_type: data.idProofType, id_proof_number: data.idProofNumber, updated_at: new Date() };
      if (profile) await tx.guest_profiles.update({ where: { id: profile.id }, data: idData });
      else await tx.guest_profiles.create({ data: { tenant_id: tenant, user_id: current.guest_id, ...idData } });
    }
    await recordAudit({ tenantId, userId: actor.userId, action: "BOOKING_CHECKED_IN", entityType: "BOOKING", entityId: updated.id, newValues: { bedId: updated.bed_id.toString(), idProofType: data.idProofType || null }, req, client: tx });
    return updated;
  }, { isolationLevel: "Serializable" });
  void inbox.notifyUsers([booking.guest_id], { tenantId, title: "Checked in", body: `You are checked in for booking ${bookingCode}. Enjoy your stay!`, type: "BOOKING_CHECKED_IN" });
  return formatBooking(booking);
};

const checkOut = async (tenantId, bookingCode, actor, req) => {
  const booking = await prisma.$transaction(async (tx) => {
    const current = await tx.bookings.findFirst({ where: { booking_code: bookingCode, tenant_id: BigInt(tenantId) } });
    if (!current) fail("Booking not found", 404, "NOT_FOUND");
    if (current.status !== "CHECKED_IN") fail("Only checked-in bookings can be checked out", 409, "INVALID_TRANSITION");
    await tx.beds.update({ where: { id: current.bed_id }, data: { status: "AVAILABLE", updated_at: new Date() } });
    const updated = await tx.bookings.update({ where: { id: current.id }, data: { status: "COMPLETED", actual_check_out: new Date(), checked_out_by: BigInt(actor.userId), updated_at: new Date() } });
    await recordAudit({ tenantId, userId: actor.userId, action: "BOOKING_CHECKED_OUT", entityType: "BOOKING", entityId: updated.id, req, client: tx });
    return updated;
  }, { isolationLevel: "Serializable" });
  void inbox.notifyUsers([booking.guest_id], { tenantId, title: "Checked out", body: `You are checked out for booking ${bookingCode}. Thanks for staying with us!`, type: "BOOKING_CHECKED_OUT" });
  return formatBooking(booking);
};

// Beds of one property with their live state: AVAILABLE / OCCUPIED / RESERVED, plus who is in the bed.
const getOccupancy = async (tenantId, propertyId) => {
  const tenant = BigInt(tenantId);
  const rooms = await prisma.rooms.findMany({ where: { tenant_id: tenant, property_id: BigInt(propertyId) }, include: { beds_beds_room_idTorooms: { orderBy: { bed_code: "asc" } } }, orderBy: { room_number: "asc" } });
  const bedIds = rooms.flatMap((room) => room.beds_beds_room_idTorooms.map((bed) => bed.id));
  const today = new Date(new Date().toDateString());
  const active = bedIds.length ? await prisma.bookings.findMany({
    where: { tenant_id: tenant, bed_id: { in: bedIds }, OR: [{ status: "CHECKED_IN" }, { status: "CONFIRMED", check_out: { gt: today } }] },
    select: { bed_id: true, booking_code: true, guest_name: true, status: true, check_in: true, check_out: true },
    orderBy: { check_in: "asc" },
  }) : [];
  const byBed = new Map();
  for (const booking of active) {
    const key = booking.bed_id.toString();
    const existing = byBed.get(key);
    if (!existing || booking.status === "CHECKED_IN") byBed.set(key, booking);
  }
  const beds = rooms.flatMap((room) => room.beds_beds_room_idTorooms.map((bed) => {
    const booking = byBed.get(bed.id.toString());
    const state = bed.status === "OCCUPIED" || booking?.status === "CHECKED_IN" ? "OCCUPIED" : booking ? "RESERVED" : bed.status;
    return {
      id: bed.id.toString(), bedCode: bed.bed_code, roomId: room.id.toString(), roomNumber: room.room_number, hasAc: room.has_ac,
      status: state, guestName: booking?.guest_name || null, bookingCode: booking?.booking_code || null,
      checkIn: booking?.check_in || null, checkOut: booking?.check_out || null,
    };
  }));
  const count = (status) => beds.filter((bed) => bed.status === status).length;
  return { summary: { total: beds.length, occupied: count("OCCUPIED"), reserved: count("RESERVED"), available: count("AVAILABLE") }, beds };
};

// Operational numbers for the front-desk dashboards (no reports permission needed).
const getDashboard = async (tenantId) => {
  const tenant = BigInt(tenantId);
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay); endOfDay.setDate(endOfDay.getDate() + 1);
  const [totalBeds, occupiedBeds, inHouse, registeredGuests, pendingBookings, checkInsToday, todayPayments] = await Promise.all([
    prisma.beds.count({ where: { tenant_id: tenant } }),
    prisma.beds.count({ where: { tenant_id: tenant, status: "OCCUPIED" } }),
    prisma.bookings.findMany({ where: { tenant_id: tenant, status: "CHECKED_IN" }, select: { guest_id: true }, distinct: ["guest_id"] }),
    prisma.users.count({ where: { tenant_id: tenant, role: "GUEST" } }),
    prisma.bookings.count({ where: { tenant_id: tenant, status: "PENDING" } }),
    prisma.bookings.count({ where: { tenant_id: tenant, status: "CONFIRMED", check_in: { gte: startOfDay, lt: endOfDay } } }),
    prisma.payments.aggregate({ where: { tenant_id: tenant, status: "PAID", paid_at: { gte: startOfDay, lt: endOfDay } }, _sum: { amount: true } }),
  ]);
  return {
    totalBeds, occupiedBeds, availableBeds: Math.max(0, totalBeds - occupiedBeds),
    currentGuests: inHouse.length, registeredGuests, pendingBookings, checkInsToday,
    todayCollections: Number(todayPayments._sum.amount || 0),
  };
};

module.exports = { registerGuest, searchGuests, getAvailability, createBooking, getBookingForCheckIn, checkIn, checkOut, getOccupancy, getDashboard };
