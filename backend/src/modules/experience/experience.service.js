const crypto = require("crypto");
const prisma = require("../../config/db");
const { recordAudit } = require("../../common/audit.service");

const fail = (message, status, code) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
};

const formatFeedback = (item) => ({
  id: item.id.toString(),
  bookingId: item.booking_id?.toString() || null,
  guestId: item.guest_id.toString(),
  overallRating: item.overall_rating,
  cleanlinessRating: item.cleanliness_rating,
  serviceRating: item.service_rating,
  valueRating: item.value_rating,
  comment: item.comment,
  status: item.status,
  createdAt: item.created_at,
});

const formatComplaint = (item) => ({
  id: item.id.toString(),
  complaintCode: item.complaint_code,
  bookingId: item.booking_id?.toString() || null,
  guestId: item.guest_id.toString(),
  category: item.category,
  subject: item.subject,
  description: item.description,
  priority: item.priority,
  status: item.status,
  assignedTo: item.assigned_to?.toString() || null,
  resolution: item.resolution,
  resolvedAt: item.resolved_at,
  createdAt: item.created_at,
});

const resolveSubmissionContext = async (tx, tenantId, data, actor) => {
  const guestId = BigInt(actor.role === "GUEST" ? actor.userId : data.guestId || 0);
  if (guestId <= 0n) fail("guestId is required", 400, "VALIDATION_ERROR");

  if (actor.role === "GUEST") {
    if (!data.bookingId) fail("bookingId is required for guest submissions", 400, "BOOKING_REQUIRED");
    const booking = await tx.bookings.findFirst({
      where: { id: BigInt(data.bookingId), guest_id: guestId },
      select: { id: true, tenant_id: true },
    });
    if (!booking) fail("Booking not found for guest", 404, "BOOKING_NOT_FOUND");
    return { guestId, tenantId: booking.tenant_id, bookingId: booking.id };
  }

  if (!tenantId) fail("A tenant is required for this operation", 400, "TENANT_REQUIRED");
  const resolvedTenantId = BigInt(tenantId);
  if (!data.bookingId) return { guestId, tenantId: resolvedTenantId, bookingId: null };
  const booking = await tx.bookings.findFirst({
    where: { id: BigInt(data.bookingId), tenant_id: resolvedTenantId, guest_id: guestId },
    select: { id: true },
  });
  if (!booking) fail("Booking not found for guest", 404, "BOOKING_NOT_FOUND");
  return { guestId, tenantId: resolvedTenantId, bookingId: booking.id };
};

const createFeedback = async (tenantId, data, actor, req) => {
  const feedback = await prisma.$transaction(async (tx) => {
    const context = await resolveSubmissionContext(tx, tenantId, data, actor);
    const created = await tx.feedback.create({
      data: {
        tenant_id: context.tenantId,
        booking_id: context.bookingId,
        guest_id: context.guestId,
        overall_rating: data.overallRating,
        cleanliness_rating: data.cleanlinessRating || null,
        service_rating: data.serviceRating || null,
        value_rating: data.valueRating || null,
        comment: data.comment || null,
      },
    });
    await recordAudit({ tenantId: context.tenantId, userId: actor.userId, action: "FEEDBACK_CREATED", entityType: "FEEDBACK", entityId: created.id, req, client: tx });
    return created;
  });
  return formatFeedback(feedback);
};

const feedbackAnalysis = async (tenantId) => {
  if (!tenantId) fail("A tenant is required for this operation", 400, "TENANT_REQUIRED");
  const where = { tenant_id: BigInt(tenantId) };
  const [summary, rows] = await Promise.all([
    prisma.feedback.aggregate({ where, _avg: { overall_rating: true, cleanliness_rating: true, service_rating: true, value_rating: true }, _count: { id: true } }),
    prisma.feedback.groupBy({ by: ["overall_rating"], where, _count: { id: true }, orderBy: { overall_rating: "asc" } }),
  ]);
  return {
    total: summary._count.id,
    averages: {
      overall: summary._avg.overall_rating || 0,
      cleanliness: summary._avg.cleanliness_rating || 0,
      service: summary._avg.service_rating || 0,
      value: summary._avg.value_rating || 0,
    },
    distribution: rows.map((row) => ({ rating: row.overall_rating, count: row._count.id })),
  };
};

const listFeedback = async (tenantId) => {
  if (!tenantId) fail("A tenant is required for this operation", 400, "TENANT_REQUIRED");
  const items = await prisma.feedback.findMany({
    where: { tenant_id: BigInt(tenantId) },
    include: { guests: { select: { name: true, email: true } }, bookings: { select: { booking_code: true } } },
    orderBy: { created_at: "desc" },
    take: 200,
  });
  return items.map((item) => ({
    ...formatFeedback(item),
    guestName: item.guests?.name || null,
    guestEmail: item.guests?.email || null,
    bookingCode: item.bookings?.booking_code || null,
  }));
};

const createComplaint = async (tenantId, data, actor, req) => {
  const complaint = await prisma.$transaction(async (tx) => {
    const context = await resolveSubmissionContext(tx, tenantId, data, actor);
    const created = await tx.complaints.create({
      data: {
        tenant_id: context.tenantId,
        booking_id: context.bookingId,
        guest_id: context.guestId,
        complaint_code: `CMP-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
        category: data.category,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
      },
    });
    await recordAudit({ tenantId: context.tenantId, userId: actor.userId, action: "COMPLAINT_CREATED", entityType: "COMPLAINT", entityId: created.id, req, client: tx });
    return created;
  });
  return formatComplaint(complaint);
};

const listComplaints = async (tenantId, status) => {
  if (!tenantId) fail("A tenant is required for this operation", 400, "TENANT_REQUIRED");
  const items = await prisma.complaints.findMany({
    where: { tenant_id: BigInt(tenantId), ...(status ? { status } : {}) },
    orderBy: [{ priority: "desc" }, { created_at: "desc" }],
  });
  return items.map(formatComplaint);
};

const listGuestComplaints = async (guestId, status) => {
  const items = await prisma.complaints.findMany({
    where: { guest_id: BigInt(guestId), ...(status ? { status } : {}) },
    orderBy: { created_at: "desc" },
  });
  return items.map(formatComplaint);
};

const updateComplaint = async (tenantId, complaintId, data, actor, req) => {
  if (!tenantId) fail("A tenant is required for this operation", 400, "TENANT_REQUIRED");
  const complaint = await prisma.$transaction(async (tx) => {
    const current = await tx.complaints.findFirst({ where: { id: BigInt(complaintId), tenant_id: BigInt(tenantId) } });
    if (!current) fail("Complaint not found", 404, "NOT_FOUND");
    if (data.assignedTo) {
      const assignee = await tx.users.findFirst({ where: { id: BigInt(data.assignedTo), tenant_id: BigInt(tenantId), status: "ACTIVE" } });
      if (!assignee) fail("Assignee not found", 404, "ASSIGNEE_NOT_FOUND");
    }
    const updated = await tx.complaints.update({
      where: { id: current.id },
      data: {
        status: data.status,
        assigned_to: data.assignedTo ? BigInt(data.assignedTo) : current.assigned_to,
        resolution: data.resolution ?? current.resolution,
        resolved_at: ["RESOLVED", "CLOSED"].includes(data.status) ? new Date() : null,
        updated_at: new Date(),
      },
    });
    await recordAudit({ tenantId, userId: actor.userId, action: "COMPLAINT_UPDATED", entityType: "COMPLAINT", entityId: updated.id, oldValues: { status: current.status }, newValues: { status: updated.status }, req, client: tx });
    return updated;
  });
  return formatComplaint(complaint);
};

module.exports = { createFeedback, feedbackAnalysis, listFeedback, createComplaint, listComplaints, listGuestComplaints, updateComplaint };
