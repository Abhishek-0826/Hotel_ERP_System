const express = require("express");
const controller = require("./camera.controller");
const validate = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");
const { createCameraSchema, updateCameraSchema } = require("./camera.validation");

const router = express.Router();

router.use(authenticate, requireRole("PLATFORM_ADMIN", "ADMIN"));
router.get("/", controller.list);
router.post("/", validate(createCameraSchema), controller.create);
router.patch("/:cameraId", validate(updateCameraSchema), controller.update);
router.delete("/:cameraId", controller.remove);

module.exports = router;
