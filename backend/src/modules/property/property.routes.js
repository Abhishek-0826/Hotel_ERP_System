/* ─────────────────────────────────────────────────────────────────────────
   src/modules/property/property.routes.js
   GET    /api/v1/properties
   GET    /api/v1/properties/:slug
   GET    /api/v1/properties/:slug/availability
   POST   /api/v1/properties                        (OWNER only)
   PATCH  /api/v1/properties/:propertyId            (OWNER only)
   PATCH  /api/v1/properties/:propertyId/status     (OWNER only)
   POST   /api/v1/properties/:propertyId/rooms      (OWNER only)
   GET    /api/v1/properties/:propertyId/rooms      (OWNER — list own rooms)
───────────────────────────────────────────────────────────────────────── */
const express = require("express");

const ctrl = require("./property.controller");
const roomCtrl = require("../room/room.controller");
const validate = require("../../middleware/validate");

const { authenticate, requireRole } = require("../../middleware/auth");
const { requireTenant } = require("../../middleware/tenantContext");

const {
  createPropertySchema,
  updatePropertySchema,
  updatePropertyStatusSchema,
} = require("./property.validation");

const { createRoomSchema } = require("../room/room.validation");

const router = express.Router();

/* ─────────────────────────────────────────────
   PUBLIC
───────────────────────────────────────────── */

// GET /api/v1/properties
router.get("/", requireTenant, ctrl.searchProperties);

// IMPORTANT: /mine MUST come before /:slug
router.get(
  "/mine",
  authenticate,
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "STAFF", "PLATFORM_ADMIN"),
  ctrl.getMyProperties
);

// GET /api/v1/properties/:slug/availability
router.get(
  "/:slug/availability",
  requireTenant,
  ctrl.getPropertyAvailability
);

// GET /api/v1/properties/:slug
router.get(
  "/:slug",
  requireTenant,
  ctrl.getPropertyBySlug
);


/* ─────────────────────────────────────────────
   OWNER / STAFF
───────────────────────────────────────────── */

// POST /api/v1/properties
router.post(
  "/",
  authenticate,
  requireRole("OWNER", "PLATFORM_ADMIN"),
  validate(createPropertySchema),
  ctrl.createProperty
);

// PATCH /api/v1/properties/:propertyId
router.patch(
  "/:propertyId",
  authenticate,
  requireRole("OWNER", "PLATFORM_ADMIN"),
  validate(updatePropertySchema),
  ctrl.updateProperty
);

// PATCH /api/v1/properties/:propertyId/status
router.patch(
  "/:propertyId/status",
  authenticate,
  requireRole("OWNER", "PLATFORM_ADMIN"),
  validate(updatePropertyStatusSchema),
  ctrl.updatePropertyStatus
);

/* ─────────────────────────────────────────────
   ROOMS
───────────────────────────────────────────── */

// GET /api/v1/properties/:propertyId/rooms
router.get(
  "/:propertyId/rooms",
  authenticate,
  requireRole("OWNER", "MANAGER", "RECEPTIONIST", "STAFF", "PLATFORM_ADMIN"),
  roomCtrl.getRoomsByProperty
);
// DELETE /api/v1/properties/:propertyId
router.delete(
  "/:propertyId",
  authenticate,
  requireRole("OWNER", "PLATFORM_ADMIN"),
  ctrl.deleteProperty
);


// POST /api/v1/properties/:propertyId/rooms
router.post(
  "/:propertyId/rooms",
  authenticate,
  requireRole("OWNER", "PLATFORM_ADMIN"),
  validate(createRoomSchema),
  roomCtrl.createRoom
);

module.exports = router;
