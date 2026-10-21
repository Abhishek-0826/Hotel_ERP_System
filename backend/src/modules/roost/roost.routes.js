/* ─────────────────────────────────────────────────────────────────────────
   src/modules/roost/roost.routes.js
   All /api/v1/roost/* frontend-facing endpoints
───────────────────────────────────────────────────────────────────────── */
const express = require("express");
const { authenticate, requireRole } = require("../../middleware/auth");
const { requirePermission } = require("../../common/rbac");
const ctrl = require("./roost.controller");

const router = express.Router();

// ─── GUESTS ──────────────────────────────────────────────────────────────────
router.get    ("/guests",     authenticate, requirePermission("guests:read"),  ctrl.listGuests);
router.get    ("/guests/:id", authenticate, requirePermission("guests:read"),  ctrl.getGuest);
router.post   ("/guests",     authenticate, requirePermission("guests:write"), ctrl.createGuest);
router.patch  ("/guests/:id", authenticate, requirePermission("guests:write"), ctrl.updateGuest);

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
router.get    ("/bookings",                   authenticate, requirePermission("reception:operate"), ctrl.listBookings);
router.post   ("/bookings",                   authenticate, requirePermission("reception:operate"), ctrl.createBooking);
router.patch  ("/bookings/:code/check-in",    authenticate, requirePermission("reception:operate"), ctrl.checkIn);
router.patch  ("/bookings/:code/check-out",   authenticate, requirePermission("reception:operate"), ctrl.checkOut);
router.patch  ("/bookings/:code/cancel",      authenticate, requirePermission("reception:operate"), ctrl.cancelBooking);

// ─── BEDS ─────────────────────────────────────────────────────────────────────
router.get("/beds",             authenticate, requirePermission("reception:operate"), ctrl.listBeds);
router.get("/beds/availability",authenticate, requirePermission("reception:operate"), ctrl.listBeds);

// ─── PAYMENTS ────────────────────────────────────────────────────────────────
router.get("/payments",     authenticate, requirePermission("finance:read"), ctrl.listPayments);
router.get("/payments/:id", authenticate, requirePermission("finance:read"), ctrl.getPayment);

// ─── INVOICES ────────────────────────────────────────────────────────────────
router.get("/invoices",               authenticate, requirePermission("finance:read"), ctrl.listInvoices);
router.get("/invoices/:bookingId",    authenticate, requirePermission("finance:read"), ctrl.getInvoiceByBooking);

// ─── REFUNDS ────────────────────────────────────────────────────────────────
router.get  ("/refunds",           authenticate, requirePermission("finance:read"),          ctrl.listRefunds);
router.post ("/refunds",           authenticate, requirePermission("finance:collect"),        ctrl.createRefund);
router.patch("/refunds/:id/approve", authenticate, requirePermission("finance:refund:approve"), ctrl.approveRefund);
router.patch("/refunds/:id/reject",  authenticate, requirePermission("finance:refund:approve"), ctrl.rejectRefund);

// ─── COMPLAINTS ──────────────────────────────────────────────────────────────
router.get  ("/complaints",     authenticate, requirePermission("experience:read"),   ctrl.listComplaints);
router.post ("/complaints",     authenticate, requirePermission("experience:write"),  ctrl.createComplaint);
router.patch("/complaints/:id", authenticate, requirePermission("experience:manage"), ctrl.updateComplaint);

// ─── FEEDBACK ────────────────────────────────────────────────────────────────
router.get ("/feedback/summary", authenticate, requirePermission("reports:read"),    ctrl.getFeedbackSummary);
router.get ("/feedback",         authenticate, requirePermission("experience:read"), ctrl.listFeedback);
router.post("/feedback",         authenticate, requirePermission("experience:write"),ctrl.createFeedback);

// ─── STAFF ───────────────────────────────────────────────────────────────────
router.get  ("/staff/performance", authenticate, requirePermission("reports:read"),  ctrl.staffPerformance);
router.get  ("/staff",             authenticate, requirePermission("users:read"),    ctrl.listStaff);
router.post ("/staff",             authenticate, requirePermission("users:manage"),  ctrl.createStaff);
router.patch("/staff/:id",         authenticate, requirePermission("users:manage"),  ctrl.updateStaff);

// ─── INVENTORY ───────────────────────────────────────────────────────────────
router.get   ("/inventory/summary",    authenticate, requirePermission("inventory:read"),   ctrl.inventorySummary);
router.get   ("/inventory",            authenticate, requirePermission("inventory:read"),   ctrl.listInventory);
router.post  ("/inventory",            authenticate, requirePermission("inventory:manage"), ctrl.createInventory);
router.patch ("/inventory/:itemId",    authenticate, requirePermission("inventory:manage"), ctrl.updateInventory);
router.delete("/inventory/:itemId",    authenticate, requirePermission("inventory:manage"), ctrl.deleteInventory);

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
router.get("/analytics/dashboard", authenticate, requirePermission("reports:read"), ctrl.analyticsDashboard);
router.get("/analytics/weekly",    authenticate, requirePermission("reports:read"), ctrl.analyticsWeekly);
router.get("/analytics/monthly",   authenticate, requirePermission("reports:read"), ctrl.analyticsMonthly);
router.get("/analytics/bi",        authenticate, requirePermission("reports:read"), ctrl.analyticsBi);

// ─── SETTINGS ────────────────────────────────────────────────────────────────
router.get  ("/settings", authenticate, requirePermission("settings:read"),  ctrl.getSettings);
router.patch("/settings", authenticate, requirePermission("settings:write"), ctrl.updateSettings);

// ─── ACCESS CONTROL ──────────────────────────────────────────────────────────
router.get  ("/access-control/permissions", authenticate, requireRole("PLATFORM_ADMIN","ADMIN"), ctrl.getAccessControl);
router.patch("/access-control/permissions", authenticate, requireRole("PLATFORM_ADMIN","ADMIN"), ctrl.updateAccessControl);

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
const systemCtrl = require("../system/system.controller");
router.get("/audit-logs", authenticate, requirePermission("audit:read"), systemCtrl.getAuditLogs);

module.exports = router;
