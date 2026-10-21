/* ─────────────────────────────────────────────────────────────────────────
   src/modules/auth/auth.controller.js
───────────────────────────────────────────────────────────────────────── */
const authService = require("./auth.service");
const env = require("../../config/env");

const register = async (req, res, next) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json({ success: true, message: "Registered successfully", data: result });
    } catch (err) { next(err); }
};

const login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);
        res.status(200).json({ success: true, message: "Login successful", data: result });
    } catch (err) { next(err); }
};

const getProfile = async (req, res, next) => {
    try {
        const user = await authService.getProfile(req.user.userId);
        res.status(200).json({ success: true, data: user });
    } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
    try {
        const result = await authService.changePassword(req.user.userId, req.body);
        res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
};


const passwordUpdated = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: await authService.markPasswordUpdated(req.user.userId) });
    } catch (err) { next(err); }
};

const adminLogin = async (req, res, next) => {
    try {
        const result = await authService.adminLogin(req.body);

        res.status(200).json({
            success: true,
            message: "Admin login successful",
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        if (env.auth.supabaseEnabled && req.body.email && req.body.email.toLowerCase() !== String(req.user.email).toLowerCase()) {
            const err = new Error("Email changes must be made through Supabase Auth.");
            err.status = 400;
            err.code = "EMAIL_CHANGE_UNSUPPORTED";
            throw err;
        }
        const roostSvc = require("../roost/roost.service");
        const result = await roostSvc.updateProfile(req.user.userId, req.body);
        res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
};

const forgotPassword = async (req, res, next) => {
    try {
        const roostSvc = require("../roost/roost.service");
        const emailOrPhone = req.body.email || req.body.phone || req.body.emailOrPhone;
        const result = await roostSvc.forgotPassword(emailOrPhone);
        res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
};

module.exports = {
    register,
    login,
    adminLogin,
    getProfile,
    changePassword,
    passwordUpdated,
    updateProfile,
    forgotPassword,
};
