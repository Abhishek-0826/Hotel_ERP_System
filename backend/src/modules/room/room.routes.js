/* ─────────────────────────────────────────────────────────────────────────
   src/modules/room/room.routes.js
   Standalone room routes (rooms not nested under properties)
   GET   /api/v1/rooms/:roomId          → get single room (owner)
   PATCH /api/v1/rooms/:roomId          → update room (owner)
───────────────────────────────────────────────────────────────────────── */
const express  = require("express");
const ctrl     = require("./room.controller");
const validate = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");
const { updateRoomSchema } = require("./room.validation");

const router = express.Router();

router.patch("/:roomId", authenticate, requireRole("OWNER","PLATFORM_ADMIN"), validate(updateRoomSchema), ctrl.updateRoom);

module.exports = router;
