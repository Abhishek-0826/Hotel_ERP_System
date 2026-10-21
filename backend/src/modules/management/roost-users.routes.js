const express = require("express");
const controller = require("./management.controller");
const validate = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");
const { createUserSchema, updateUserSchema, passwordResetSchema } = require("./management.validation");

const router = express.Router();

// The platform route is separate from legacy tenant-scoped management routes.
// ADMIN remains accepted only as a compatibility alias for PLATFORM_ADMIN.
router.use(authenticate, requireRole("PLATFORM_ADMIN", "ADMIN"));
router.get("/", controller.listPlatformUsers);
router.post("/", validate(createUserSchema), controller.createPlatformUser);
router.patch("/:userId", validate(updateUserSchema), controller.updatePlatformUser);
router.post("/:userId/reset-password", validate(passwordResetSchema), controller.resetPlatformUserPassword);
router.delete("/:userId", controller.deletePlatformUser);
router.patch("/:userId/activate", controller.activatePlatformUser);
router.patch("/:userId/deactivate", controller.deactivatePlatformUser);

module.exports = router;
