/* ─────────────────────────────────────────────────────────────────────────
   src/middleware/auth.js
   JWT auth middleware — lightweight, no Google OAuth complexity yet.
   Decodes Bearer token and attaches req.user = { userId, email, role, tenantId }
───────────────────────────────────────────────────────────────────────── */
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const env = require("../config/env");
const { verifySupabaseToken } = require("../lib/supabaseAuth");
const { findTenantById } = require("./tenantContext");

const PLATFORM_ROLES = ["PLATFORM_ADMIN", "ADMIN"];

const fail = (message, code, status = 401) => {
    const err = new Error(message);
    err.status = status;
    err.code = code;
    return err;
};

const USER_SELECT = { id: true, email: true, role: true, tenant_id: true, status: true, auth_user_id: true };

/* Legacy token issued by this API (AUTH_MODE=legacy|hybrid). */
const userFromLegacyToken = async (token) => {
    const decoded = jwt.verify(token, env.jwt.secret, { algorithms: ["HS256"] });
    return prisma.users.findUnique({ where: { id: BigInt(decoded.userId) }, select: USER_SELECT });
};

/* Supabase token -> application user (roles/tenant live in our users table).
   Match by auth_user_id; on first login link an existing row by verified
   email; optionally create a GUEST row (only when `provision` is true). */
const userFromSupabaseToken = async (token, { provision }) => {
    const identity = await verifySupabaseToken(token);

    let user = await prisma.users.findUnique({ where: { auth_user_id: identity.sub }, select: USER_SELECT });
    if (user) return user;

    const byEmail = await prisma.users.findFirst({ where: { email: { equals: identity.email, mode: "insensitive" } }, select: USER_SELECT });
    if (byEmail) {
        if (byEmail.auth_user_id && byEmail.auth_user_id !== identity.sub) {
            throw fail("This email is linked to a different login", "AUTH_LINK_CONFLICT", 409);
        }
        return prisma.users.update({ where: { id: byEmail.id }, data: { auth_user_id: identity.sub }, select: USER_SELECT });
    }

    if (!provision) throw fail("No ROOST account for this login. Sign in again to finish setup.", "ACCOUNT_NOT_PROVISIONED", 403);

    const phone = /^[6-9]\d{9}$/.test(identity.phone || "") ? identity.phone : null;
    try {
        return await prisma.users.create({
            data: {
                name: (identity.name || identity.email.split("@")[0]).slice(0, 255).padEnd(2, "_"),
                email: identity.email,
                phone,
                auth_user_id: identity.sub,
                role: "GUEST",
                status: "ACTIVE",
                tenant_id: null,
            },
            select: USER_SELECT,
        });
    } catch (error) {
        if (error.code !== "P2002") throw error;
        return prisma.users.findUnique({ where: { auth_user_id: identity.sub }, select: USER_SELECT });
    }
};

const resolveUser = async (token, options) => {
    const alg = jwt.decode(token, { complete: true })?.header?.alg;
    // Legacy tokens are HS256 signed by this API; try them first when allowed.
    if (env.auth.legacyEnabled && alg === "HS256") {
        try {
            return await userFromLegacyToken(token);
        } catch (error) {
            if (!env.auth.supabaseEnabled || !env.supabase.jwtSecret) throw error;
        }
    }
    if (!env.auth.supabaseEnabled) throw fail("Invalid or expired token", "TOKEN_INVALID");
    return userFromSupabaseToken(token, options);
};

const buildAuthenticate = (options) => async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(fail("Authorization token required", "UNAUTHORIZED"));
        }

        const user = await resolveUser(authHeader.split(" ")[1], options);
        if (!user || user.status !== "ACTIVE") {
            return next(fail("Account is inactive", "ACCOUNT_INACTIVE"));
        }

        // Hotel staff may only act inside their own hotel, and not once it is suspended.
        if (user.tenant_id && !PLATFORM_ROLES.includes(user.role)) {
            if (req.tenant && req.tenant.id !== user.tenant_id.toString()) {
                return next(fail("This account belongs to a different hotel.", "TENANT_MISMATCH", 403));
            }
            const tenant = await findTenantById(user.tenant_id);
            if (tenant && tenant.status !== "ACTIVE") {
                return next(fail("This hotel is currently unavailable.", "TENANT_SUSPENDED", 403));
            }
        }

        req.user = {
            userId: user.id.toString(),
            id: user.id.toString(),        // alias for convenience
            email: user.email,
            role: user.role,
            tenantId: user.tenant_id ? user.tenant_id.toString() : null,
            tenant_id: user.tenant_id ? user.tenant_id.toString() : null,
        };

        next();
    } catch (error) {
        if (error.status) return next(error);
        next(fail("Invalid or expired token", "TOKEN_INVALID"));
    }
};

const authenticate = buildAuthenticate({ provision: false });
// Used only by GET /auth/me: first sign-in creates the GUEST profile row.
const authenticateAndProvision = buildAuthenticate({ provision: true });

// Public endpoints can use this to enrich a request when a valid token is
// present without requiring guests to sign in first.
const authenticateOptional = (req, res, next) => {
    if (!req.headers.authorization) return next();
    return authenticate(req, res, next);
};

/* Role guard factory — use: requireRole("OWNER", "STAFF") */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        const err  = new Error("Unauthorized");
        err.status = 401;
        err.code   = "UNAUTHORIZED";
        return next(err);
    }
    if (!roles.includes(req.user.role)) {
        const err  = new Error(
            `Access denied. Required role: ${roles.join(" or ")}`
        );
        err.status = 403;
        err.code   = "FORBIDDEN";
        return next(err);
    }
    next();
};

module.exports = { authenticate, authenticateAndProvision, authenticateOptional, requireRole };
