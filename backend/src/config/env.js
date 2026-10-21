/* ─────────────────────────────────────────────────────────────────────────
   src/config/env.js — Validated environment configuration
   All env vars in ONE place. App reads from this, never from process.env directly.
───────────────────────────────────────────────────────────────────────── */
require("dotenv").config({ quiet: true });

const required = (key) => {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required env var: ${key}`);
    return value;
};

const port = Number.parseInt(process.env.PORT || "5000", 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
}

const nodeEnv = process.env.NODE_ENV || "development";
if (nodeEnv === "production" && !process.env.CORS_ORIGINS) {
    throw new Error("CORS_ORIGINS is required in production");
}

// AUTH_MODE: "supabase" = only Supabase Auth tokens, "hybrid" = Supabase tokens
// plus legacy email/password tokens issued by this API, "legacy" = legacy only.
const authMode = String(process.env.AUTH_MODE || "hybrid").toLowerCase();
if (!["supabase", "hybrid", "legacy"].includes(authMode)) {
    throw new Error("AUTH_MODE must be one of: supabase, hybrid, legacy");
}
const supabaseUrl = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
if (authMode !== "legacy" && !supabaseUrl) {
    throw new Error("SUPABASE_URL is required unless AUTH_MODE=legacy");
}

// The legacy signing secret is only needed while legacy tokens are accepted.
const jwtSecret = authMode === "supabase" ? (process.env.JWT_SECRET || "") : required("JWT_SECRET");
if (authMode !== "supabase" && nodeEnv === "production" && jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
}

const corsOrigins = String(process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

const env = {
    port,
    nodeEnv,
    isProduction: nodeEnv === "production",

    database: {
        url: required("DATABASE_URL"),
        // Encrypts the connection without verifying the CA (needed for the Supabase pooler).
        ssl: /^(true|1|require)$/i.test(process.env.DB_SSL || ""),
        poolMax: Number.parseInt(process.env.DB_POOL_MAX || "10", 10),
    },

    jwt: {
        secret:    jwtSecret,
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },

    auth: {
        mode: authMode,
        legacyEnabled: authMode !== "supabase",
        supabaseEnabled: authMode !== "legacy",
    },

    supabase: {
        url: supabaseUrl,
        // Only for projects still on the legacy HS256 JWT secret.
        jwtSecret: process.env.SUPABASE_JWT_SECRET || null,
        // Server-only. Lets admins create users / reset passwords. Never expose.
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    },

    whatsapp: {
        token:      process.env.WHATSAPP_TOKEN      || null,
        phoneId:    process.env.WHATSAPP_PHONE_ID   || null,
        apiVersion: process.env.WHATSAPP_API_VERSION || "v19.0",
    },

    app: {
        baseUrl: process.env.BASE_URL || `http://localhost:${port}`,
        // Public URL of the frontend; used in invite / reset email links.
        publicAppUrl: String(process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/+$/, ""),
        corsOrigins,
        bodyLimit: process.env.REQUEST_BODY_LIMIT || "1mb",
    },
};

module.exports = env;
