/* ─────────────────────────────────────────────────────────────────────────
   src/modules/bed/bed.routes.js
   GET   /api/v1/rooms/:roomId/beds      (owner)
   POST  /api/v1/rooms/:roomId/beds      (owner)
   PATCH /api/v1/beds/:bedId             (owner)
───────────────────────────────────────────────────────────────────────── */
const express  = require("express");
const ctrl     = require("./bed.controller");
const validate = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");
const { createBedSchema, updateBedSchema } = require("./bed.validation");

const router = express.Router();

router.get( "/rooms/:roomId/beds",   authenticate, requireRole("OWNER","MANAGER","RECEPTIONIST","STAFF","PLATFORM_ADMIN"), ctrl.getBedsByRoom);
router.post("/rooms/:roomId/beds",   authenticate, requireRole("OWNER","PLATFORM_ADMIN"), validate(createBedSchema), ctrl.createBed);
router.patch("/beds/:bedId",         authenticate, requireRole("OWNER","PLATFORM_ADMIN"), validate(updateBedSchema), ctrl.updateBed);

module.exports = router;
