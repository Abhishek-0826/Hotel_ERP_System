/* ─────────────────────────────────────────────────────────────────────────
   src/modules/auth/auth.routes.js

   POST /api/v1/auth/register
   POST /api/v1/auth/login

   GET  /api/v1/auth/me
   POST /api/v1/auth/change-password

   POST /api/v1/auth/admin/login
───────────────────────────────────────────────────────────────────────── */

const express = require("express");
const controller = require("./auth.controller");
const validate = require("../../middleware/validate");
const { authenticate, authenticateAndProvision } = require("../../middleware/auth");
const env = require("../../config/env");

/* Password flows are owned by Supabase Auth when AUTH_MODE=supabase. */
const legacyOnly = (_req, _res, next) => {
    if (env.auth.legacyEnabled) return next();
    const err = new Error("Sign-in, sign-up and password changes are handled by Supabase Auth.");
    err.status = 404;
    err.code = "AUTH_HANDLED_BY_SUPABASE";
    return next(err);
};

const {
    registerSchema,
    loginSchema,
    adminLoginSchema,
    changePasswordSchema,
    updateProfileSchema,
    forgotPasswordSchema,
} = require("./auth.validation");

const router = express.Router();

/* ─────────────────────────────────────────────────────────────────────────
   GENERAL AUTH
───────────────────────────────────────────────────────────────────────── */

/* Register Guest / Owner / Staff */
router.post(
    "/register",
    legacyOnly,
    validate(registerSchema),
    controller.register
);

/* Login Guest / Owner / Staff */
router.post(
    "/login",
    legacyOnly,
    validate(loginSchema),
    controller.login
);

/* Forgot Password */
router.post(
    "/forgot-password",
    legacyOnly,
    validate(forgotPasswordSchema),
    controller.forgotPassword
);

/* ─────────────────────────────────────────────────────────────────────────
   PROTECTED AUTH
───────────────────────────────────────────────────────────────────────── */

/* Current logged-in user */
router.get(
    "/me",
    authenticateAndProvision,
    controller.getProfile
);

/* Update Profile */
router.patch(
    "/me",
    authenticate,
    validate(updateProfileSchema),
    controller.updateProfile
);

/* Called by the SPA after Supabase accepted a new password */
router.post(
    "/password-updated",
    authenticate,
    controller.passwordUpdated
);

/* Change password */
router.post(
    "/change-password",
    legacyOnly,
    authenticate,
    validate(changePasswordSchema),
    controller.changePassword
);

/* ─────────────────────────────────────────────────────────────────────────
   ADMIN AUTH
───────────────────────────────────────────────────────────────────────── */

/* Admin Login */
router.post(
    "/admin/login",
    legacyOnly,
    validate(adminLoginSchema),
    controller.adminLogin
);

/* ───────────────────────────────────────────────────────────────────────── */

module.exports = router;
