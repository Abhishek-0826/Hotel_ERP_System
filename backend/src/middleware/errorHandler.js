/* ─────────────────────────────────────────────────────────────────────────
   src/middleware/errorHandler.js
   Central error handler — never leaks internals in production
───────────────────────────────────────────────────────────────────────── */
const env = require("../config/env");

const errorHandler = (err, req, res, next) => {
    const resolvedStatus = err.status || 500;
    if (resolvedStatus >= 500) {
        console.error(JSON.stringify({
            level: "error",
            event: "request_failed",
            method: req.method,
            path: req.originalUrl.split("?", 1)[0],
            status: resolvedStatus,
            code: err.code || "INTERNAL_ERROR",
            message: err.message,
            ...(!env.isProduction ? { stack: err.stack } : {}),
        }));
    }
    // Prisma unique-constraint / known-request errors
    if (err.code === "P2002") {
        return res.status(409).json({
            success: false,
            code: "DUPLICATE_ENTRY",
            message: "A record with that value already exists.",
            errors: {},
        });
    }
    if (err.code === "P2025") {
        return res.status(404).json({
            success: false,
            code: "NOT_FOUND",
            message: "Record not found.",
            errors: {},
        });
    }

    const status = resolvedStatus;
    const code   = err.code   || "INTERNAL_ERROR";
    const message = status < 500
        ? err.message
        : "An unexpected error occurred. Please try again.";

    return res.status(status).json({
        success: false,
        code,
        message,
        errors: err.errors || {},
    });
};

module.exports = errorHandler;
