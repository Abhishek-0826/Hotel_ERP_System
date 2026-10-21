/* ─────────────────────────────────────────────────────────────────────────
   src/modules/booking/booking.routes.js
   POST  /api/v1/bookings                     — Guest: create booking
   GET   /api/v1/bookings                     — Owner: list bookings
   GET   /api/v1/bookings/:code               — Guest/Owner: get booking
   PATCH /api/v1/bookings/:code/confirm       — Owner: confirm
   PATCH /api/v1/bookings/:code/reject        — Owner: reject (with reason)
   PATCH /api/v1/bookings/:code/cancel        — Guest/Owner: cancel
───────────────────────────────────────────────────────────────────────── */
const express  = require("express");
const ctrl     = require("./booking.controller");
const validate = require("../../middleware/validate");
const { authenticate, authenticateOptional, requireRole } = require("../../middleware/auth");
const { createBookingSchema, rejectBookingSchema, cancelBookingSchema } = require("./booking.validation");

const router = express.Router();

/* Owner literal routes must come before parameter routes */
router.get( "/owner",                    authenticate, requireRole("OWNER","MANAGER","RECEPTIONIST","STAFF","PLATFORM_ADMIN"), ctrl.listOwnerBookings);
router.get( "/mine",                     authenticate, requireRole("GUEST"), ctrl.listGuestBookings);

/* Guest routes */
router.post("/",                         authenticateOptional, validate(createBookingSchema), ctrl.createBooking);
router.get( "/:code",                    authenticateOptional,                       ctrl.getBookingByCode);
router.patch("/:code/cancel",             authenticateOptional, validate(cancelBookingSchema), ctrl.cancelBooking);

/* Owner routes */
router.get( "/",                         authenticate, requireRole("OWNER","MANAGER","RECEPTIONIST","STAFF","PLATFORM_ADMIN"), ctrl.listOwnerBookings);
router.patch("/:code/confirm",           authenticate, requireRole("OWNER","MANAGER","PLATFORM_ADMIN"),                  ctrl.confirmBooking);
router.patch("/:code/approve",           authenticate, requireRole("OWNER","MANAGER","PLATFORM_ADMIN"),                  ctrl.confirmBooking);
router.patch("/:code/reject",            authenticate, requireRole("OWNER","MANAGER","PLATFORM_ADMIN"), validate(rejectBookingSchema), ctrl.rejectBooking);

module.exports = router;
