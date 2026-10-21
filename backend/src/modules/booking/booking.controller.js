/* ─────────────────────────────────────────────────────────────────────────
   src/modules/booking/booking.controller.js
───────────────────────────────────────────────────────────────────────── */
const svc = require("./booking.service");

const createBooking = async (req, res, next) => {
    try {
        const data = await svc.createBooking({ ...req.body, guestId: req.user?.role === "GUEST" ? req.user.userId : undefined, tenantId: req.tenant?.id });
        res.status(201).json({ success: true, message: "Booking created. Awaiting owner confirmation.", data });
    } catch (err) { next(err); }
};

const getBookingByCode = async (req, res, next) => {
    try {
        const data = await svc.getBookingByCode(req.params.code, req.user);
        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
};

const confirmBooking = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId;
        const allTenants = ["PLATFORM_ADMIN", "ADMIN"].includes(req.user?.role);
        if (!tenantId && !allTenants) return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "tenantId required" });
        const data = await svc.confirmBooking(req.params.code, tenantId, { allTenants });
        res.status(200).json({ success: true, message: "Booking confirmed", data });
    } catch (err) { next(err); }
};

const rejectBooking = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId;
        const { reason } = req.body;
        const allTenants = ["PLATFORM_ADMIN", "ADMIN"].includes(req.user?.role);
        if (!tenantId && !allTenants) return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "tenantId required" });
        const data = await svc.rejectBooking(req.params.code, tenantId, reason, { allTenants });
        res.status(200).json({ success: true, message: "Booking rejected", data });
    } catch (err) { next(err); }
};

const cancelBooking = async (req, res, next) => {
    try {
        const { reason, guestEmail } = req.body;
        const data = await svc.cancelBooking(req.params.code, reason, req.user, guestEmail);
        res.status(200).json({ success: true, message: "Booking cancelled", data });
    } catch (err) { next(err); }
};

const listOwnerBookings = async (req, res, next) => {
    try {
        const tenantId = req.user?.tenantId;
        const allTenants = ["PLATFORM_ADMIN", "ADMIN"].includes(req.user?.role);
        if (!tenantId && !allTenants) return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "tenantId required" });
        const result = await svc.listOwnerBookings({ tenantId, allTenants, ...req.query });
        res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
};

const listGuestBookings = async (req, res, next) => {
    try {
        const result = await svc.listGuestBookings({ ...req.query, guestId: req.user.userId, tenantId: req.tenant?.id });
        res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
};

module.exports = { createBooking, getBookingByCode, confirmBooking, rejectBooking, cancelBooking, listOwnerBookings, listGuestBookings };
