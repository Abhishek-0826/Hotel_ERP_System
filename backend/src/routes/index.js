/* ─────────────────────────────────────────────────────────────────────────
   src/routes/index.js  — Master router
───────────────────────────────────────────────────────────────────────── */
const express = require("express");

const authRoutes     = require("../modules/auth/auth.routes");
const propertyRoutes = require("../modules/property/property.routes");
const roomRoutes     = require("../modules/room/room.routes");
const bedRoutes      = require("../modules/bed/bed.routes");
const bookingRoutes  = require("../modules/booking/booking.routes");
const analyticsRoutes = require("../modules/analytics/analytics.routes");
const receptionRoutes = require("../modules/reception/reception.routes");
const financeRoutes = require("../modules/finance/finance.routes");
const managementRoutes = require("../modules/management/management.routes");
const roostUsersRoutes = require("../modules/management/roost-users.routes");
const experienceRoutes = require("../modules/experience/experience.routes");
const reportsRoutes = require("../modules/reports/reports.routes");
const systemRoutes = require("../modules/system/system.routes");
const cameraRoutes = require("../modules/camera/camera.routes");
const roostRoutes  = require("../modules/roost/roost.routes");
const { publicRouter: publicTenantRoutes, ownerRouter: tenantRoutes, platformRouter } = require("../modules/tenant/tenant.routes");
const notificationRoutes = require("../modules/notification/notification.routes");
const router = express.Router();


router.use("/public/tenants", publicTenantRoutes);
router.use("/tenant",     tenantRoutes);
router.use("/platform",   platformRouter);
router.use("/auth",       authRoutes);
router.use("/properties", propertyRoutes);
router.use("/rooms",      roomRoutes);   // PATCH /rooms/:roomId
router.use("/",           bedRoutes);    // GET|POST /rooms/:roomId/beds, PATCH /beds/:bedId
router.use("/bookings",   bookingRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/analytics", reportsRoutes);
router.use("/reception", receptionRoutes);
router.use("/finance", financeRoutes);
router.use("/management", managementRoutes);
router.use("/roost/users", roostUsersRoutes);
router.use("/experience", experienceRoutes);
router.use("/reports", reportsRoutes);
router.use("/roost/reports", reportsRoutes);
router.use("/system", systemRoutes);
router.use("/notifications", notificationRoutes);
router.use("/roost/cameras", cameraRoutes);
router.use("/roost", roostRoutes);

module.exports = router;
