const crypto = require("crypto");
const prisma = require("../../config/db");
const { recordAudit } = require("../../common/audit.service");
const inbox = require("../notification/inbox.service");
const fail = (message, status, code) => { const error = new Error(message); error.status = status; error.code = code; throw error; };
const code = (prefix) => `${prefix}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
const formatPayment = (payment) => ({
  id: payment.id.toString(), guestId: payment.bookings?.guest_id?.toString() || null,
  bookingId: payment.booking_id.toString(), paymentCode: payment.payment_code,
  amount: Number(payment.amount), method: payment.method, status: payment.status,
  date: payment.paid_at || payment.created_at, paidAt: payment.paid_at,
  transactionRef: payment.transaction_ref, createdAt: payment.created_at,
  invoiceNumber: payment.invoices?.[0]?.invoice_number || null,
});
const formatRefund = (refund) => ({
  id: refund.id.toString(), guestId: refund.bookings?.guest_id?.toString() || null,
  paymentId: refund.payment_id.toString(), bookingId: refund.booking_id.toString(), refundCode: refund.refund_code,
  amount: Number(refund.amount), reason: refund.reason, date: refund.created_at,
  status: refund.status, processedAt: refund.processed_at,
});
const formatInvoice = (invoice) => ({
  id: invoice.id.toString(), bookingId: invoice.booking_id.toString(), paymentId: invoice.payment_id?.toString() || null,
  invoiceNumber: invoice.invoice_number, guest: invoice.bookings?.users ? {
    id: invoice.bookings.users.id.toString(), name: invoice.bookings.users.name,
    email: invoice.bookings.users.email, phone: invoice.bookings.users.phone,
  } : null,
  amount: Number(invoice.total_amount), subtotal: Number(invoice.subtotal), taxAmount: Number(invoice.tax_amount),
  totalAmount: Number(invoice.total_amount), date: invoice.issued_at || invoice.created_at,
  status: invoice.status, issuedAt: invoice.issued_at,
});

const updateBookingPaymentStatus = async (tx, booking) => {
  const [paid, refunded] = await Promise.all([
    tx.payments.aggregate({ where: { booking_id: booking.id, status: "PAID" }, _sum: { amount: true } }),
    tx.refunds.aggregate({ where: { booking_id: booking.id, status: { in: ["APPROVED", "COMPLETED"] } }, _sum: { amount: true } }),
  ]);
  const net = Number(paid._sum.amount || 0) - Number(refunded._sum.amount || 0);
  const total = Number(booking.total_amount);
  const paymentStatus = net <= 0 ? "UNPAID" : net >= total ? "PAID" : "PARTIALLY_PAID";
  return tx.bookings.update({ where: { id: booking.id }, data: { payment_status: paymentStatus, updated_at: new Date() } });
};

// The payments table only allows UPI / CARD / NET_BANKING / COD (chk_payments_method), so cash is stored as COD.
const storedMethod = (method) => (method === "CASH" ? "COD" : method);

const collectPayment = async (tenantId, data, actor, req) => {
  // A single { amount, method } is just a one-entry split.
  const parts = (data.splits || [{ method: data.method, amount: data.amount, transactionRef: data.transactionRef }]).map((part) => ({ ...part, method: storedMethod(part.method) }));
  const total = parts.reduce((sum, part) => sum + part.amount, 0);
  const { created, bookingRow } = await prisma.$transaction(async (tx) => {
    const booking = await tx.bookings.findFirst({ where: { id: BigInt(data.bookingId), tenant_id: BigInt(tenantId) } });
    if (!booking) fail("Booking not found", 404, "NOT_FOUND");
    if (!["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(booking.status)) fail("Payments can only be collected for confirmed bookings", 409, "INVALID_PAYMENT_STATE");
    const prior = await tx.payments.aggregate({ where: { booking_id: booking.id, status: "PAID" }, _sum: { amount: true } });
    if (Number(prior._sum.amount || 0) + total > Number(booking.total_amount) + 0.001) fail("Payment exceeds the outstanding booking balance", 409, "PAYMENT_EXCEEDS_BALANCE");
    const rows = [];
    for (const part of parts) {
      const row = await tx.payments.create({ data: { tenant_id: BigInt(tenantId), booking_id: booking.id, payment_code: code("PAY"), amount: part.amount.toFixed(2), method: part.method, status: "PAID", received_by: BigInt(actor.userId), transaction_ref: part.transactionRef || null, notes: data.notes || null, paid_at: new Date() } });
      const invoice = await tx.invoices.create({ data: { tenant_id: BigInt(tenantId), booking_id: booking.id, payment_id: row.id, invoice_number: code("RCT"), subtotal: row.amount, tax_amount: "0", total_amount: row.amount, status: "PAID", issued_at: new Date() } });
      rows.push({ ...row, invoices: [invoice] });
    }
    await updateBookingPaymentStatus(tx, booking);
    await recordAudit({ tenantId, userId: actor.userId, action: "PAYMENT_COLLECTED", entityType: "PAYMENT", entityId: rows[0].id, newValues: { total, bookingId: data.bookingId, splits: parts.map((part) => ({ method: part.method, amount: part.amount })) }, req, client: tx });
    return { created: rows, bookingRow: booking };
  }, { isolationLevel: "Serializable" });
  void inbox.notifyUsers([bookingRow.guest_id], { tenantId, title: "Payment received", body: `We received ₹${total.toFixed(2)} for booking ${bookingRow.booking_code}.`, type: "PAYMENT_RECEIVED" });
  const formatted = created.map(formatPayment);
  return data.splits ? formatted : formatted[0];
};

// Filters: bookingId, and from/to (ISO timestamps) to list one day's collections.
const listPayments = async (tenantId, { bookingId, from, to } = {}) => {
  const paidAt = {};
  if (from) paidAt.gte = new Date(from);
  if (to) paidAt.lt = new Date(to);
  const rows = await prisma.payments.findMany({
    where: { tenant_id: BigInt(tenantId), ...(bookingId ? { booking_id: BigInt(bookingId) } : {}), ...(from || to ? { OR: [{ paid_at: paidAt }, { paid_at: null, created_at: paidAt }] } : {}) },
    include: { bookings: { select: { guest_id: true, booking_code: true, guest_name: true } }, received_user: { select: { name: true } }, invoices: { select: { invoice_number: true }, take: 1 } },
    orderBy: { created_at: "desc" },
  });
  return rows.map(formatPayment);
};
const getInvoice = async (tenantId, invoiceNumber) => {
  const invoice = await prisma.invoices.findFirst({ where: { tenant_id: BigInt(tenantId), invoice_number: invoiceNumber }, include: { bookings: { include: { users: { select: { id: true, name: true, email: true, phone: true } } } } } });
  if (!invoice) fail("Invoice not found", 404, "NOT_FOUND");
  return formatInvoice(invoice);
};

const requestRefund = async (tenantId, data, actor, req) => {
  const refund = await prisma.$transaction(async (tx) => {
    const payment = await tx.payments.findFirst({ where: { id: BigInt(data.paymentId), tenant_id: BigInt(tenantId), status: "PAID" } });
    if (!payment) fail("Paid payment not found", 404, "PAYMENT_NOT_FOUND");
    const committed = await tx.refunds.aggregate({ where: { payment_id: payment.id, status: { in: ["REQUESTED", "APPROVED", "COMPLETED"] } }, _sum: { amount: true } });
    if (Number(committed._sum.amount || 0) + data.amount > Number(payment.amount)) fail("Refund exceeds the eligible payment amount", 409, "REFUND_EXCEEDS_ELIGIBLE_AMOUNT");
    const created = await tx.refunds.create({ data: { tenant_id: BigInt(tenantId), payment_id: payment.id, booking_id: payment.booking_id, refund_code: code("RFD"), amount: data.amount.toFixed(2), reason: data.reason, status: "REQUESTED" } });
    await recordAudit({ tenantId, userId: actor.userId, action: "REFUND_REQUESTED", entityType: "REFUND", entityId: created.id, newValues: { amount: data.amount, paymentId: data.paymentId }, req, client: tx });
    return created;
  }, { isolationLevel: "Serializable" });
  return formatRefund(refund);
};

const decideRefund = async (tenantId, refundId, action, actor, req) => {
  const refund = await prisma.$transaction(async (tx) => {
    const current = await tx.refunds.findFirst({ where: { id: BigInt(refundId), tenant_id: BigInt(tenantId) } });
    if (!current) fail("Refund not found", 404, "NOT_FOUND");
    if (current.status !== "REQUESTED") fail("Only requested refunds can be decided", 409, "INVALID_TRANSITION");
    if (action === "APPROVE") {
      const payment = await tx.payments.findUnique({ where: { id: current.payment_id } });
      const committed = await tx.refunds.aggregate({ where: { payment_id: current.payment_id, status: { in: ["APPROVED", "COMPLETED"] } }, _sum: { amount: true } });
      if (Number(committed._sum.amount || 0) + Number(current.amount) > Number(payment.amount)) fail("Refund exceeds the eligible payment amount", 409, "REFUND_EXCEEDS_ELIGIBLE_AMOUNT");
    }
    const updated = await tx.refunds.update({ where: { id: current.id }, data: { status: action === "APPROVE" ? "APPROVED" : "REJECTED", approved_by: BigInt(actor.userId), processed_at: action === "APPROVE" ? new Date() : null, updated_at: new Date() } });
    if (action === "APPROVE") { const booking = await tx.bookings.findUnique({ where: { id: current.booking_id } }); await updateBookingPaymentStatus(tx, booking); }
    await recordAudit({ tenantId, userId: actor.userId, action: `REFUND_${action}D`, entityType: "REFUND", entityId: updated.id, newValues: { status: updated.status }, req, client: tx });
    return updated;
  }, { isolationLevel: "Serializable" });
  return formatRefund(refund);
};

module.exports = { collectPayment, listPayments, getInvoice, requestRefund, decideRefund };
