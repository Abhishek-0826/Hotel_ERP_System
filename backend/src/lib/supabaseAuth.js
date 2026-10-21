/* ─────────────────────────────────────────────────────────────────────────
   src/lib/supabaseAuth.js
   - verifySupabaseToken: validates a Supabase Auth access token
       * asymmetric keys (ES256/RS256) via the project's JWKS endpoint
       * legacy shared secret (HS256) via SUPABASE_JWT_SECRET
   - admin helpers (service-role key) to create users / set passwords
───────────────────────────────────────────────────────────────────────── */
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const JWKS_TTL_MS = 10 * 60 * 1000;
const JWKS_MIN_REFETCH_MS = 30 * 1000;
let jwksCache = { keys: new Map(), fetchedAt: 0 };

const authError = (message, code = "TOKEN_INVALID", status = 401) => {
    const err = new Error(message);
    err.status = status;
    err.code = code;
    return err;
};

const issuer = () => `${env.supabase.url}/auth/v1`;

const loadJwks = async () => {
    const res = await fetch(`${issuer()}/.well-known/jwks.json`);
    if (!res.ok) throw authError("Unable to load Supabase signing keys", "AUTH_PROVIDER_UNAVAILABLE", 503);
    const { keys = [] } = await res.json();
    jwksCache = {
        keys: new Map(keys.map((jwk) => [jwk.kid, crypto.createPublicKey({ key: jwk, format: "jwk" })])),
        fetchedAt: Date.now(),
    };
};

const getSigningKey = async (kid) => {
    const age = Date.now() - jwksCache.fetchedAt;
    if (age > JWKS_TTL_MS || (!jwksCache.keys.has(kid) && age > JWKS_MIN_REFETCH_MS)) await loadJwks();
    const key = jwksCache.keys.get(kid);
    if (!key) throw authError("Unknown token signing key");
    return key;
};

/** Returns { sub, email, name, phone } for a valid Supabase access token. */
const verifySupabaseToken = async (token) => {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) throw authError("Malformed token");
    const { alg, kid } = decoded.header;

    const options = { issuer: issuer(), audience: "authenticated" };
    let payload;
    try {
        if (alg === "HS256") {
            if (!env.supabase.jwtSecret) throw authError("Unsupported token");
            payload = jwt.verify(token, env.supabase.jwtSecret, { ...options, algorithms: ["HS256"] });
        } else if (alg === "ES256" || alg === "RS256") {
            payload = jwt.verify(token, await getSigningKey(kid), { ...options, algorithms: [alg] });
        } else {
            throw authError("Unsupported token algorithm");
        }
    } catch (error) {
        if (error.status) throw error;
        throw authError("Invalid or expired token");
    }

    if (!payload.sub || !payload.email) throw authError("Token has no verified email");
    const meta = payload.user_metadata || {};
    return {
        sub: payload.sub,
        email: String(payload.email).toLowerCase(),
        name: meta.name || meta.full_name || null,
        phone: meta.phone || null,
    };
};

/* ── Admin API (needs SUPABASE_SERVICE_ROLE_KEY) ───────────────────────── */

const adminEnabled = () => env.auth.supabaseEnabled && Boolean(env.supabase.serviceRoleKey);

const serviceHeaders = () => {
    const key = env.supabase.serviceRoleKey;
    // Legacy service_role keys are JWTs and go in both headers; new sb_secret_ keys are apikey-only.
    return { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) };
};

const adminRequest = async (method, path, body, { base = "/auth/v1/admin", query = "" } = {}) => {
    const res = await fetch(`${env.supabase.url}${base}${path}${query}`, {
        method,
        headers: { "Content-Type": "application/json", ...serviceHeaders() },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.msg || data.message || "Supabase admin request failed");
        err.status = res.status === 422 ? 409 : 502;
        err.code = data.error_code || "AUTH_PROVIDER_ERROR";
        throw err;
    }
    return data;
};

/** Creates a confirmed Supabase user. Returns its uuid. */
const createAuthUser = async ({ email, password, name, phone }) => {
    const data = await adminRequest("POST", "/users", {
        email,
        password,
        email_confirm: true,
        user_metadata: { name, phone: phone || undefined },
    });
    return data.id;
};

/** Emails the person a link to set their own password. Returns the new user's uuid. */
const inviteAuthUser = async ({ email, name, redirectTo }) => {
    const data = await adminRequest("POST", "/invite", { email, data: { name } }, {
        base: "/auth/v1",
        query: `?redirect_to=${encodeURIComponent(redirectTo)}`,
    });
    return data.id;
};

const deleteAuthUser = (authUserId) => adminRequest("DELETE", `/users/${authUserId}`);

/** Looks up a Supabase user id by email (admin API); null when absent. */
const findAuthUserIdByEmail = async (email) => {
    const data = await adminRequest("GET", "/users", undefined, { query: "?per_page=1000" });
    const match = (data.users || []).find((u) => String(u.email).toLowerCase() === email.toLowerCase());
    return match ? match.id : null;
};

/** Uploads a public file to Supabase Storage (creating the public bucket if needed). Returns its public URL. */
const uploadPublicFile = async (bucket, path, buffer, contentType) => {
    const base = `${env.supabase.url}/storage/v1`;
    await fetch(`${base}/bucket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...serviceHeaders() },
        body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    }).catch(() => {}); // already exists -> ignore
    const res = await fetch(`${base}/object/${bucket}/${path}`, {
        method: "POST",
        headers: { "Content-Type": contentType, "x-upsert": "true", ...serviceHeaders() },
        body: buffer,
    });
    if (!res.ok) {
        const err = new Error("Logo upload to Supabase Storage failed");
        err.status = 502;
        err.code = "STORAGE_UPLOAD_FAILED";
        throw err;
    }
    return `${base}/object/public/${bucket}/${path}`;
};

const setAuthPassword = (authUserId, password) => adminRequest("PUT", `/users/${authUserId}`, { password });

module.exports = {
    verifySupabaseToken, adminEnabled, createAuthUser, setAuthPassword,
    inviteAuthUser, deleteAuthUser, findAuthUserIdByEmail, uploadPublicFile,
};
