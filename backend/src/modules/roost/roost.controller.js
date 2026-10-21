/* ─────────────────────────────────────────────────────────────────────────
   src/modules/roost/roost.controller.js
───────────────────────────────────────────────────────────────────────── */
const svc = require("./roost.service");

const ok  = (fn, status=200) => async (req, res, next) => { try { res.status(status).json({ success: true, data: await fn(req) }); } catch (e) { next(e); } };
const tenantId = (req) => req.user.tenantId;

module.exports = {
  // Guests
  listGuests:   ok((req) => svc.listGuests(tenantId(req), req.query.q, req.query.status)),
  getGuest:     ok((req) => svc.getGuest(tenantId(req), req.params.id)),
  createGuest:  ok((req) => svc.createGuest(tenantId(req), req.body, req.user, req), 201),
  updateGuest:  ok((req) => svc.updateGuest(tenantId(req), req.params.id, req.body, req.user, req)),

  // Bookings
  listBookings: ok((req) => svc.listBookings(tenantId(req), req.query.q, req.query.status)),
  createBooking: ok((req) => svc.createRoostBooking(tenantId(req), req.body, req.user, req), 201),
  checkIn:  ok((req) => svc.roostCheckIn(tenantId(req), req.params.code, req.user, req)),
  checkOut: ok((req) => svc.roostCheckOut(tenantId(req), req.params.code, req.user, req)),
  cancelBooking: ok((req) => svc.cancelBooking(tenantId(req), req.params.code, req.body?.reason, req.user, req)),

  // Beds
  listBeds: ok((req) => svc.listBeds(tenantId(req), req.query.type, req.query.status)),

  // Payments
  listPayments: ok((req) => svc.listPayments(tenantId(req), req.user, req.query.bookingId)),
  getPayment:   ok((req) => svc.getPayment(tenantId(req), req.params.id, req.user)),

  // Invoices
  listInvoices:      ok((req) => svc.listInvoices(tenantId(req), req.query.propertyId)),
  getInvoiceByBooking: ok((req) => svc.getInvoiceByBooking(tenantId(req), req.params.bookingId)),

  // Refunds
  listRefunds:   ok((req) => svc.listRefunds(tenantId(req), req.query.status)),
  createRefund:  ok((req) => svc.createRefund(tenantId(req), req.body, req.user, req), 201),
  approveRefund: ok((req) => svc.approveRefund(tenantId(req), req.params.id, req.user, req)),
  rejectRefund:  ok((req) => svc.rejectRefund(tenantId(req), req.params.id, req.user, req)),

  // Complaints
  listComplaints:  ok((req) => svc.listComplaints(tenantId(req), req.user, req.query.status)),
  createComplaint: ok((req) => svc.createComplaint(tenantId(req), req.body, req.user, req), 201),
  updateComplaint: ok((req) => svc.updateComplaint(tenantId(req), req.params.id, req.body, req.user, req)),

  // Feedback
  listFeedback:      ok((req) => svc.listFeedback(tenantId(req), req.user)),
  createFeedback:    ok((req) => svc.createFeedback(tenantId(req), req.body, req.user, req), 201),
  getFeedbackSummary: ok((req) => svc.getFeedbackSummary(tenantId(req))),

  // Staff
  listStaff:       ok((req) => svc.listStaff(tenantId(req), req.query.role)),
  createStaff:     ok((req) => svc.createStaff(tenantId(req), req.body, req.user, req), 201),
  updateStaff:     ok((req) => svc.updateStaff(tenantId(req), req.params.id, req.body, req.user, req)),
  staffPerformance: ok((req) => svc.staffPerformance(tenantId(req))),

  // Inventory
  listInventory:    ok((req) => svc.listInventory(tenantId(req), req.query.propertyId)),
  createInventory:  ok((req) => svc.createInventory(tenantId(req), req.body, req.user, req), 201),
  updateInventory:  ok((req) => svc.updateInventory(tenantId(req), req.params.itemId, req.body, req.user, req)),
  deleteInventory:  ok((req) => svc.deleteInventory(tenantId(req), req.params.itemId, req.user, req)),
  inventorySummary: ok((req) => svc.inventorySummary(tenantId(req))),

  // Analytics
  analyticsDashboard: ok((req) => svc.analyticsDashboard(tenantId(req))),
  analyticsWeekly:    ok((req) => svc.analyticsWeekly(tenantId(req))),
  analyticsMonthly:   ok((req) => svc.analyticsMonthly(tenantId(req))),
  analyticsBi:        ok((req) => svc.analyticsBi(tenantId(req))),

  // Settings
  getSettings:    ok((req) => svc.getSettings(tenantId(req))),
  updateSettings: ok((req) => svc.updateSettings(tenantId(req), req.body, req.user, req)),

  // Access control
  getAccessControl:    ok((_req) => svc.getAccessControl()),
  updateAccessControl: ok((req) => svc.updateAccessControl(req.body)),

  // Auth extensions
  updateProfile:   ok((req) => svc.updateProfile(req.user.userId, req.body)),
  forgotPassword:  ok((req) => svc.forgotPassword(req.body.email || req.body.phone || ""), 200),
};
