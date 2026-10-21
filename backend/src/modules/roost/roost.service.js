/* ─────────────────────────────────────────────────────────────────────────
   src/modules/roost/roost.service.js
   Thin service layer for all /roost/* frontend-facing endpoints.
   Reuses existing services; adds only the extra logic needed.
───────────────────────────────────────────────────────────────────────── */
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const prisma = require("../../config/db");
const { recordAudit } = require("../../common/audit.service");
const receptionSvc = require("../reception/reception.service");
const financeSvc   = require("../finance/finance.service");
const experienceSvc = require("../experience/experience.service");
const managementSvc = require("../management/management.service");
const reportsSvc = require("../reports/reports.service");
const systemSvc  = require("../system/system.service");

const fail = (msg, status, code) => { const e = new Error(msg); e.status = status; e.code = code; throw e; };
const toId = (v, label="ID") => { try { const id = BigInt(v); if (id <= 0n) throw 0; return id; } catch { fail(`${label} must be a positive numeric ID`, 400, "INVALID_ID"); } };
const fmt = Object.fromEntries;

// ─── GUESTS ───────────────────────────────────────────────────────────────────
const formatGuest = (u) => ({
  id: u.id.toString(), name: u.name, phone: u.phone || null, email: u.email,
  gender: u.guest_profiles?.[0]?.gender || null,
  address: u.guest_profiles?.[0]?.address || null,
  status: u.status,
  joined: u.created_at,
  room: null, // populated separately if needed
  idProofType: u.guest_profiles?.[0]?.id_proof_type || null,
  idProofNumber: u.guest_profiles?.[0]?.id_proof_number || null,
  idProofPhoto: u.guest_profiles?.[0]?.id_proof_photo || null,
  tenantId: u.tenant_id?.toString() || null,
});

const listGuests = async (tenantId, q, status) => {
  const where = { tenant_id: toId(tenantId, "Tenant ID"), role: "GUEST" };
  if (status) where.status = status;
  if (q) where.OR = [
    { name: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
    { phone: { contains: q } },
  ];
  const users = await prisma.users.findMany({ where, include: { guest_profiles: true }, orderBy: { created_at: "desc" } });
  return users.map(formatGuest);
};

const getGuest = async (tenantId, guestId) => {
  const user = await prisma.users.findFirst({
    where: { id: toId(guestId, "Guest ID"), tenant_id: toId(tenantId, "Tenant ID"), role: "GUEST" },
    include: {
      guest_profiles: true,
      bookings_as_guest: { include: { payments: true }, orderBy: { created_at: "desc" }, take: 20 },
    },
  });
  if (!user) fail("Guest not found", 404, "NOT_FOUND");
  return {
    ...formatGuest(user),
    bookings: user.bookings_as_guest.map((b) => ({
      id: b.id.toString(), bookingCode: b.booking_code, status: b.status,
      checkIn: b.check_in, checkOut: b.check_out, totalAmount: b.total_amount.toString(),
    })),
    payments: user.bookings_as_guest.flatMap((b) =>
      b.payments.map((p) => ({
        id: p.id.toString(), bookingId: p.booking_id.toString(), amount: p.amount.toString(), method: p.method, status: p.status, paidAt: p.paid_at,
      }))
    ),
  };
};

const createGuest = (tenantId, data, actor, req) => receptionSvc.registerGuest(tenantId, data, actor, req);

const updateGuest = async (tenantId, guestId, data, actor, req) => {
  const user = await prisma.users.findFirst({ where: { id: toId(guestId, "Guest ID"), tenant_id: toId(tenantId), role: "GUEST" }, include: { guest_profiles: true } });
  if (!user) fail("Guest not found", 404, "NOT_FOUND");
  await prisma.$transaction(async (tx) => {
    if (data.name || data.phone || data.email) {
      const upd = {};
      if (data.name)  upd.name  = data.name;
      if (data.phone) upd.phone = data.phone;
      if (data.email) upd.email = data.email;
      upd.updated_at = new Date();
      await tx.users.update({ where: { id: user.id }, data: upd });
    }
    const profileFields = {};
    if (data.idProofType   !== undefined) profileFields.id_proof_type   = data.idProofType;
    if (data.idProofNumber !== undefined) profileFields.id_proof_number = data.idProofNumber;
    if (data.address       !== undefined) profileFields.address         = data.address;
    if (data.city          !== undefined) profileFields.city            = data.city;
    if (data.state         !== undefined) profileFields.state           = data.state;
    if (data.gender        !== undefined) profileFields.gender          = data.gender;
    if (data.notes         !== undefined) profileFields.notes           = data.notes;
    if (data.idProofPhoto  !== undefined) profileFields.id_proof_photo  = data.idProofPhoto;
    if (Object.keys(profileFields).length > 0) {
      profileFields.updated_at = new Date();
      const profile = user.guest_profiles[0];
      if (profile) await tx.guest_profiles.update({ where: { id: profile.id }, data: profileFields });
      else await tx.guest_profiles.create({ data: { tenant_id: toId(tenantId), user_id: user.id, ...profileFields } });
    }
    await recordAudit({ tenantId, userId: actor.userId, action: "GUEST_UPDATED", entityType: "GUEST", entityId: user.id, req, client: tx });
  });
  return getGuest(tenantId, guestId);
};

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
const formatBookingFull = (b) => ({
  id: b.id.toString(), bookingCode: b.booking_code, guestId: b.guest_id.toString(),
  guest: b.users ? { id: b.users.id.toString(), name: b.users.name, phone: b.users.phone, email: b.users.email } : null,
  checkIn: b.check_in, checkOut: b.check_out,
  bed: b.beds_bookings_bed_idTobeds ? { id: b.beds_bookings_bed_idTobeds.id.toString(), bedCode: b.beds_bookings_bed_idTobeds.bed_code, status: b.beds_bookings_bed_idTobeds.status } : null,
  amount: b.total_amount.toString(),
  status: b.status, paymentStatus: b.payment_status,
  source: b.source, createdAt: b.created_at,
});

const listBookings = async (tenantId, q, status) => {
  const where = { tenant_id: toId(tenantId) };
  if (status) where.status = status;
  if (q) where.OR = [
    { booking_code: { contains: q, mode: "insensitive" } },
    { guest_name: { contains: q, mode: "insensitive" } },
    { guest_phone: { contains: q } },
  ];
  const rows = await prisma.bookings.findMany({
    where, orderBy: { created_at: "desc" }, take: 100,
    include: { users: { select: { id: true, name: true, phone: true, email: true } }, beds_bookings_bed_idTobeds: { select: { id: true, bed_code: true, status: true } } },
  });
  return rows.map(formatBookingFull);
};

const createRoostBooking = (tenantId, data, actor, req) => receptionSvc.createBooking(tenantId, data, actor, req);
const roostCheckIn  = (tenantId, code, actor, req) => receptionSvc.checkIn(tenantId, code, actor, req);
const roostCheckOut = (tenantId, code, actor, req) => receptionSvc.checkOut(tenantId, code, actor, req);

const cancelBooking = async (tenantId, code, reason, actor, req) => {
  const booking = await prisma.bookings.findFirst({ where: { booking_code: code, tenant_id: toId(tenantId) } });
  if (!booking) fail("Booking not found", 404, "NOT_FOUND");
  if (["CANCELLED", "COMPLETED"].includes(booking.status)) fail(`Cannot cancel a ${booking.status} booking`, 409, "INVALID_TRANSITION");
  const updated = await prisma.bookings.update({ where: { id: booking.id }, data: { status: "CANCELLED", rejection_reason: reason || null, updated_at: new Date() } });
  if (booking.status === "CHECKED_IN") {
    await prisma.beds.update({ where: { id: booking.bed_id }, data: { status: "AVAILABLE", updated_at: new Date() } });
  }
  await recordAudit({ tenantId, userId: actor.userId, action: "BOOKING_CANCELLED", entityType: "BOOKING", entityId: booking.id, req });
  return { id: updated.id.toString(), bookingCode: updated.booking_code, status: updated.status };
};

// ─── BEDS ────────────────────────────────────────────────────────────────────
const listBeds = async (tenantId, type, status) => {
  const where = { tenant_id: toId(tenantId) };
  if (status) where.status = status;
  if (type) where.rooms_beds_room_idTorooms = { has_ac: type === "AC" };
  const beds = await prisma.beds.findMany({
    where, include: { rooms_beds_room_idTorooms: { select: { id: true, room_number: true, has_ac: true, floor: true, property_id: true } } },
    orderBy: [{ rooms_beds_room_idTorooms: { room_number: "asc" } }, { bed_code: "asc" }],
  });
  return beds.map((bed) => ({
    id: bed.id.toString(),
    room: bed.rooms_beds_room_idTorooms ? {
      id: bed.rooms_beds_room_idTorooms.id.toString(),
      roomNumber: bed.rooms_beds_room_idTorooms.room_number,
      hasAc: bed.rooms_beds_room_idTorooms.has_ac,
      floor: bed.rooms_beds_room_idTorooms.floor,
      propertyId: bed.rooms_beds_room_idTorooms.property_id?.toString(),
    } : null,
    type: bed.rooms_beds_room_idTorooms?.has_ac ? "AC" : "NON_AC",
    status: bed.status,
    bedCode: bed.bed_code,
    position: bed.position,
    priceOverride: bed.price_override?.toString() || null,
    guest: null,
  }));
};

// ─── PAYMENTS (with guest-ownership scoping) ─────────────────────────────────
const listPayments = async (tenantId, actor, bookingId) => {
  const where = { tenant_id: toId(tenantId) };
  if (actor.role === "GUEST") {
    // Only own booking payments
    const guestBookingIds = (await prisma.bookings.findMany({ where: { tenant_id: toId(tenantId), guest_id: toId(actor.userId) }, select: { id: true } })).map((b) => b.id);
    where.booking_id = { in: guestBookingIds };
  } else if (bookingId) {
    where.booking_id = toId(bookingId, "Booking ID");
  }
  const payments = await prisma.payments.findMany({ where, orderBy: { created_at: "desc" } });
  return payments.map((p) => ({ id: p.id.toString(), bookingId: p.booking_id.toString(), paymentCode: p.payment_code, amount: p.amount.toString(), method: p.method, status: p.status, transactionRef: p.transaction_ref, paidAt: p.paid_at, createdAt: p.created_at }));
};

const getPayment = async (tenantId, paymentId, actor) => {
  const payment = await prisma.payments.findFirst({ where: { id: toId(paymentId, "Payment ID"), tenant_id: toId(tenantId) } });
  if (!payment) fail("Payment not found", 404, "NOT_FOUND");
  if (actor.role === "GUEST") {
    const booking = await prisma.bookings.findUnique({ where: { id: payment.booking_id } });
    if (!booking || booking.guest_id.toString() !== actor.userId) fail("Access denied", 403, "FORBIDDEN");
  }
  return { id: payment.id.toString(), bookingId: payment.booking_id.toString(), paymentCode: payment.payment_code, amount: payment.amount.toString(), method: payment.method, status: payment.status, transactionRef: payment.transaction_ref, paidAt: payment.paid_at, createdAt: payment.created_at };
};

// ─── INVOICES ────────────────────────────────────────────────────────────────
const listInvoices = async (tenantId, propertyId) => {
  const where = { tenant_id: toId(tenantId) };
  if (propertyId) where.bookings = { property_id: toId(propertyId, "Property ID") };
  const invoices = await prisma.invoices.findMany({ where, orderBy: { created_at: "desc" } });
  return invoices.map((inv) => ({ id: inv.id.toString(), bookingId: inv.booking_id.toString(), invoiceNumber: inv.invoice_number, total: inv.total_amount.toString(), status: inv.status, issuedAt: inv.issued_at }));
};

const getInvoiceByBooking = async (tenantId, bookingId) => {
  const invoice = await prisma.invoices.findFirst({ where: { tenant_id: toId(tenantId), booking_id: toId(bookingId, "Booking ID") }, orderBy: { created_at: "desc" } });
  if (!invoice) fail("Invoice not found for this booking", 404, "NOT_FOUND");
  return { id: invoice.id.toString(), bookingId: invoice.booking_id.toString(), paymentId: invoice.payment_id?.toString() || null, invoiceNumber: invoice.invoice_number, subtotal: invoice.subtotal.toString(), taxAmount: invoice.tax_amount.toString(), totalAmount: invoice.total_amount.toString(), status: invoice.status, issuedAt: invoice.issued_at };
};

// ─── REFUNDS ─────────────────────────────────────────────────────────────────
const listRefunds = async (tenantId, status) => {
  const where = { tenant_id: toId(tenantId) };
  if (status) where.status = status;
  const refunds = await prisma.refunds.findMany({ where, orderBy: { created_at: "desc" } });
  return refunds.map((r) => ({ id: r.id.toString(), paymentId: r.payment_id.toString(), bookingId: r.booking_id.toString(), refundCode: r.refund_code, amount: r.amount.toString(), reason: r.reason, status: r.status, processedAt: r.processed_at }));
};

const createRefund = (tenantId, data, actor, req) => financeSvc.requestRefund(tenantId, data, actor, req);
const approveRefund = (tenantId, id, actor, req) => financeSvc.decideRefund(tenantId, id, "APPROVE", actor, req);
const rejectRefund  = (tenantId, id, actor, req) => financeSvc.decideRefund(tenantId, id, "REJECT",  actor, req);

// ─── COMPLAINTS (guest-scoped) ────────────────────────────────────────────────
const listComplaints = async (tenantId, actor, status) => {
  const where = { tenant_id: toId(tenantId) };
  if (actor.role === "GUEST") where.guest_id = toId(actor.userId);
  if (status) where.status = status;
  const rows = await prisma.complaints.findMany({ where, orderBy: [{ priority: "desc" }, { created_at: "desc" }] });
  return rows.map((c) => ({ id: c.id.toString(), complaintCode: c.complaint_code, category: c.category, subject: c.subject, description: c.description, priority: c.priority, status: c.status, guestId: c.guest_id.toString(), assignedTo: c.assigned_to?.toString() || null, resolution: c.resolution, resolvedAt: c.resolved_at, createdAt: c.created_at }));
};
const createComplaint = (tenantId, data, actor, req) => experienceSvc.createComplaint(tenantId, data, actor, req);
const updateComplaint = (tenantId, id, data, actor, req) => experienceSvc.updateComplaint(tenantId, id, data, actor, req);

// ─── FEEDBACK (guest-scoped) ──────────────────────────────────────────────────
const listFeedback = async (tenantId, actor) => {
  const where = { tenant_id: toId(tenantId) };
  if (actor.role === "GUEST") where.guest_id = toId(actor.userId);
  const rows = await prisma.feedback.findMany({ where, orderBy: { created_at: "desc" } });
  return rows.map((f) => ({ id: f.id.toString(), bookingId: f.booking_id?.toString() || null, guestId: f.guest_id.toString(), overallRating: f.overall_rating, comment: f.comment, createdAt: f.created_at }));
};
const createFeedback = (tenantId, data, actor, req) => experienceSvc.createFeedback(tenantId, data, actor, req);
const getFeedbackSummary = async (tenantId) => {
  const analysis = await experienceSvc.feedbackAnalysis(tenantId);
  const avg = analysis.averages.overall;
  return {
    averageRating: avg,
    totalFeedback: analysis.total,
    distribution: analysis.distribution,
    positive: analysis.distribution.filter((d) => d.rating >= 4).reduce((sum, d) => sum + d.count, 0),
    negative: analysis.distribution.filter((d) => d.rating <= 2).reduce((sum, d) => sum + d.count, 0),
    neutral: analysis.distribution.filter((d) => d.rating === 3).reduce((sum, d) => sum + d.count, 0),
  };
};

// ─── STAFF ───────────────────────────────────────────────────────────────────
const STAFF_ROLES = ["MANAGER", "RECEPTIONIST", "STAFF"];
const listStaff = (tenantId, role) => managementSvc.listUsers(tenantId, role && STAFF_ROLES.includes(role) ? role : undefined);
const createStaff = (tenantId, data, actor, req) => managementSvc.createUser(tenantId, data, actor, req);
const updateStaff = (tenantId, id, data, actor, req) => managementSvc.updateUser(tenantId, id, data, actor, req);
const staffPerformance = (tenantId) => reportsSvc.staffPerformance(tenantId);

// ─── INVENTORY ───────────────────────────────────────────────────────────────
const listInventory  = (tenantId, propertyId) => managementSvc.listItems(tenantId, propertyId);
const createInventory= (tenantId, data, actor, req) => managementSvc.createItem(tenantId, data, actor, req);
const updateInventory= async (tenantId, itemId, data, actor, req) => {
  const item = await prisma.inventory_items.findFirst({ where: { id: toId(itemId, "Item ID"), tenant_id: toId(tenantId), status: "ACTIVE" } });
  if (!item) fail("Inventory item not found", 404, "NOT_FOUND");
  const updateData = { updated_at: new Date() };
  if (data.name !== undefined)        updateData.name           = data.name;
  if (data.minStock !== undefined)    updateData.min_stock_level = String(data.minStock);
  if (data.costPerUnit !== undefined) updateData.cost_per_unit  = String(data.costPerUnit);
  const updated = await prisma.inventory_items.update({ where: { id: item.id }, data: updateData });
  await recordAudit({ tenantId, userId: actor.userId, action: "INVENTORY_UPDATED", entityType: "INVENTORY_ITEM", entityId: item.id, req });
  return { id: updated.id.toString(), name: updated.name, minStockLevel: updated.min_stock_level.toString(), costPerUnit: updated.cost_per_unit?.toString() || null };
};
const deleteInventory= async (tenantId, itemId, actor, req) => {
  const item = await prisma.inventory_items.findFirst({ where: { id: toId(itemId, "Item ID"), tenant_id: toId(tenantId) } });
  if (!item) fail("Inventory item not found", 404, "NOT_FOUND");
  await prisma.inventory_items.update({ where: { id: item.id }, data: { status: "DELETED", updated_at: new Date() } });
  await recordAudit({ tenantId, userId: actor.userId, action: "INVENTORY_DELETED", entityType: "INVENTORY_ITEM", entityId: item.id, req });
  return { id: item.id.toString(), deleted: true };
};
const inventorySummary = async (tenantId) => {
  const items = await prisma.inventory_items.findMany({ where: { tenant_id: toId(tenantId), status: { not: "DELETED" } } });
  const totalItems = items.length;
  const availableStock = items.reduce((s, i) => s + Number(i.current_stock), 0);
  const lowStock = items.filter((i) => Number(i.current_stock) <= Number(i.min_stock_level)).length;
  const outOfStock = items.filter((i) => Number(i.current_stock) === 0).length;
  const inventoryValue = items.reduce((s, i) => s + (Number(i.current_stock) * Number(i.cost_per_unit || 0)), 0);
  return { totalItems, availableStock, lowStock, outOfStock, inventoryValue: inventoryValue.toFixed(2) };
};

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
const analyticsDashboard = async (tenantId) => {
  const tid = toId(tenantId);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const [
    totalBeds, acBeds, nonAcBeds, availableBeds, occupiedBeds, reservedBeds,
    pendingBookings, pendingPayments, totalGuests, todayCheckIns, todayCheckOuts,
    revenueAgg, inventoryAlerts
  ] = await Promise.all([
    prisma.beds.count({ where: { tenant_id: tid } }),
    prisma.beds.count({ where: { tenant_id: tid, rooms_beds_room_idTorooms: { has_ac: true } } }),
    prisma.beds.count({ where: { tenant_id: tid, rooms_beds_room_idTorooms: { has_ac: false } } }),
    prisma.beds.count({ where: { tenant_id: tid, status: "AVAILABLE" } }),
    prisma.beds.count({ where: { tenant_id: tid, status: "OCCUPIED" } }),
    prisma.bookings.count({ where: { tenant_id: tid, status: "CONFIRMED" } }),
    prisma.bookings.count({ where: { tenant_id: tid, status: "PENDING" } }),
    prisma.bookings.count({ where: { tenant_id: tid, payment_status: "UNPAID", status: { in: ["CONFIRMED","CHECKED_IN"] } } }),
    prisma.users.count({ where: { tenant_id: tid, role: "GUEST" } }),
    prisma.bookings.count({ where: { tenant_id: tid, actual_check_in: { gte: today, lt: tomorrow } } }),
    prisma.bookings.count({ where: { tenant_id: tid, actual_check_out: { gte: today, lt: tomorrow } } }),
    prisma.payments.aggregate({ where: { tenant_id: tid, status: "PAID" }, _sum: { amount: true } }),
    prisma.inventory_items.count({ where: { tenant_id: tid, status: "ACTIVE", current_stock: { lte: 0 } } }).catch(() => 0),
  ]);

  // Weekly revenue (last 7 days)
  const weeklyRevenue = []; const weeklyOccupancy = []; const weeklyLabels = [];
  for (let i = 6; i >= 0; i--) {
    const from = new Date(today); from.setDate(from.getDate() - i);
    const to   = new Date(from);  to.setDate(to.getDate() + 1);
    const [rev, occ] = await Promise.all([
      prisma.payments.aggregate({ where: { tenant_id: tid, status: "PAID", paid_at: { gte: from, lt: to } }, _sum: { amount: true } }),
      prisma.bookings.count({ where: { tenant_id: tid, status: "CHECKED_IN", actual_check_in: { lt: to }, check_out: { gt: from } } }),
    ]);
    weeklyRevenue.push(Number(rev._sum.amount || 0));
    weeklyOccupancy.push(occ);
    weeklyLabels.push(from.toISOString().split("T")[0]);
  }

  // Monthly revenue (last 30 days, grouped by week)
  const monthlyRevenue = []; const monthlyLabels = [];
  for (let w = 3; w >= 0; w--) {
    const from = new Date(today); from.setDate(from.getDate() - (w+1)*7);
    const to   = new Date(today); to.setDate(to.getDate()   - w*7);
    const rev  = await prisma.payments.aggregate({ where: { tenant_id: tid, status: "PAID", paid_at: { gte: from, lt: to } }, _sum: { amount: true } });
    monthlyRevenue.push(Number(rev._sum.amount || 0));
    monthlyLabels.push(from.toISOString().split("T")[0]);
  }

  return {
    totalBeds, acBeds, nonAcBeds, availableBeds, occupiedBeds, reservedBeds,
    pendingBookings, pendingPayments, totalGuests, todayCheckIns, todayCheckOuts,
    revenue: Number(revenueAgg._sum.amount || 0).toFixed(2),
    inventoryAlerts,
    weeklyRevenue, weeklyOccupancy, weeklyLabels,
    monthlyRevenue, monthlyLabels,
  };
};

const analyticsWeekly  = (tenantId) => reportsSvc.bi(tenantId, 7);
const analyticsMonthly = (tenantId) => reportsSvc.bi(tenantId, 30);
const analyticsBi = async (tenantId) => {
  const tid = toId(tenantId);
  const days = 30;
  const from = new Date(); from.setDate(from.getDate() - days);
  const [bookingRows, revenueRows, guestRows, complaintRows, feedbackRows] = await Promise.all([
    prisma.bookings.groupBy({ by: ["status"], where: { tenant_id: tid, created_at: { gte: from } }, _count: { id: true } }),
    prisma.payments.groupBy({ by: ["method"], where: { tenant_id: tid, status: "PAID", paid_at: { gte: from } }, _sum: { amount: true } }),
    prisma.users.count({ where: { tenant_id: tid, role: "GUEST", created_at: { gte: from } } }),
    prisma.complaints.groupBy({ by: ["status"], where: { tenant_id: tid, created_at: { gte: from } }, _count: { id: true } }),
    prisma.feedback.aggregate({ where: { tenant_id: tid, created_at: { gte: from } }, _avg: { overall_rating: true }, _count: { id: true } }),
  ]);
  return {
    occupancy: [], // populated from bed status counts
    revenue: revenueRows.map((r) => ({ method: r.method, amount: Number(r._sum.amount || 0) })),
    bookings: bookingRows.map((r) => ({ status: r.status, count: r._count.id })),
    guests: [{ period: `last${days}days`, count: guestRows }],
    labels: [], complaints: complaintRows.map((r) => ({ status: r.status, count: r._count.id })),
    feedbackAvg: [{ period: `last${days}days`, avg: feedbackRows._avg.overall_rating || 0, count: feedbackRows._count.id }],
  };
};

// ─── SETTINGS (flat ↔ array conversion) ──────────────────────────────────────
const SETTING_KEY_MAP = {
  propertyName: "property_name", address: "property_address", checkInTime: "check_in_time",
  checkOutTime: "check_out_time", taxRate: "tax_rate", currency: "currency",
  whatsappNumber: "whatsapp_number", timezone: "timezone",
};
const getSettings = async (tenantId) => {
  const grouped = await systemSvc.getSettings(tenantId);
  const flat = {};
  for (const [cat, keys] of Object.entries(grouped)) {
    if (cat === "_meta") continue;
    for (const [k, v] of Object.entries(keys)) {
      const frontendKey = Object.keys(SETTING_KEY_MAP).find((fk) => SETTING_KEY_MAP[fk] === k) || k;
      flat[frontendKey] = v;
    }
  }
  return flat;
};
const updateSettings = async (tenantId, flatData, actor, req) => {
  const settings = Object.entries(flatData).map(([fk, v]) => ({
    key: SETTING_KEY_MAP[fk] || fk,
    value: v === null ? null : String(v),
    category: "GENERAL",
  }));
  return systemSvc.updateSettings(settings, tenantId, actor.userId, req);
};

// ─── AUTH EXTENSIONS ─────────────────────────────────────────────────────────
const updateProfile = async (userId, data) => {
  const user = await prisma.users.findUnique({ where: { id: toId(userId, "User ID") } });
  if (!user) fail("User not found", 404, "NOT_FOUND");
  if (data.email && data.email !== user.email) {
    const existing = await prisma.users.findUnique({ where: { email: data.email } });
    if (existing) fail("Email already registered", 409, "EMAIL_EXISTS");
  }
  const updateData = { updated_at: new Date() };
  if (data.name  !== undefined) updateData.name  = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  const updated = await prisma.users.update({ where: { id: user.id }, data: updateData });
  return { id: updated.id.toString(), name: updated.name, email: updated.email, phone: updated.phone, role: updated.role };
};

const forgotPassword = async (emailOrPhone) => {
  const user = await prisma.users.findFirst({
    where: emailOrPhone.includes("@") ? { email: emailOrPhone } : { phone: emailOrPhone },
  });
  // For security: always return success even if not found
  if (!user) return { message: "If an account exists, a reset link has been sent" };
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 3600_000); // 1 hour
  // Store token (table created by migration 0005)
  await prisma.$executeRaw`
    INSERT INTO password_reset_tokens(user_id, token, expires_at)
    VALUES(${user.id}, ${token}, ${expiresAt})
    ON CONFLICT DO NOTHING
  `;
  // Delivery is intentionally delegated to the deployment's email/SMS worker.
  // Never return reset tokens through the public API.
  return { message: "If an account exists, a reset link has been sent" };
};

// ─── ACCESS CONTROL ───────────────────────────────────────────────────────────
const getAccessControl = () => systemSvc.getAccessControl();
const { ROLE_PERMISSIONS } = require("../../common/rbac");
// Runtime-only in-memory permission updates (reloads on restart)
const updateAccessControl = (data) => {
  if (data && data.permissions && typeof data.permissions === "object") {
    for (const [role, perms] of Object.entries(data.permissions)) {
      if (ROLE_PERMISSIONS[role] && Array.isArray(perms)) {
        ROLE_PERMISSIONS[role] = perms;
      }
    }
  }
  return { roles: Object.keys(ROLE_PERMISSIONS), permissions: { ...ROLE_PERMISSIONS } };
};

module.exports = {
  listGuests, getGuest, createGuest, updateGuest,
  listBookings, createRoostBooking, roostCheckIn, roostCheckOut, cancelBooking,
  listBeds,
  listPayments, getPayment,
  listInvoices, getInvoiceByBooking,
  listRefunds, createRefund, approveRefund, rejectRefund,
  listComplaints, createComplaint, updateComplaint,
  listFeedback, createFeedback, getFeedbackSummary,
  listStaff, createStaff, updateStaff, staffPerformance,
  listInventory, createInventory, updateInventory, deleteInventory, inventorySummary,
  analyticsDashboard, analyticsWeekly, analyticsMonthly, analyticsBi,
  getSettings, updateSettings,
  updateProfile, forgotPassword,
  getAccessControl, updateAccessControl,
};
