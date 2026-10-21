/* ─────────────────────────────────────────────────────────────────────────
   src/middleware/validate.js
   Zod validation middleware — returns 400 with structured error details
───────────────────────────────────────────────────────────────────────── */
const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        const issues = error.issues || error.errors || [];
        const errors = Object.fromEntries(issues.map((issue) => [
            issue.path.join(".") || "body", issue.message,
        ]));
        return res.status(400).json({
            success: false,
            code:    "VALIDATION_ERROR",
            message: "Validation failed",
            errors,
        });
    }
};

module.exports = validate;
