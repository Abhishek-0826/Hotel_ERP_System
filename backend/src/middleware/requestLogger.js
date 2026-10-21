/* ─────────────────────────────────────────────────────────────────────────
   src/middleware/requestLogger.js
   Structured request/response logger — never logs secrets
───────────────────────────────────────────────────────────────────────── */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const path = req.originalUrl.split("?", 1)[0];

    res.on("finish", () => {
        const duration = Date.now() - start;
        const log = {
            method:   req.method,
            path,
            status:   res.statusCode,
            duration: `${duration}ms`,
            ip:       req.ip,
        };
        if (res.statusCode >= 400) {
            console.error(JSON.stringify(log));
        } else {
            console.log(JSON.stringify(log));
        }
    });

    next();
};

module.exports = requestLogger;
