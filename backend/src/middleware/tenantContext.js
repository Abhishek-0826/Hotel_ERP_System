/* ─────────────────────────────────────────────────────────────────────────
   src/middleware/tenantContext.js
   Resolves the hotel (tenant) a request is for. The frontend lives at
   /<hotel-slug>/... and sends that slug in the X-Tenant-Slug header.
   Sets req.tenant = { id, slug, name, status } for active hotels.
───────────────────────────────────────────────────────────────────────── */
const prisma = require("../config/db");

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/;
const TTL_MS = 30 * 1000;
const bySlug = new Map();
const byId = new Map();

const fail = (message, code, status) => {
    const err = new Error(message);
    err.status = status;
    err.code = code;
    return err;
};

const remember = (tenant) => {
    const entry = { tenant, at: Date.now() };
    if (tenant) {
        bySlug.set(tenant.slug, entry);
        byId.set(tenant.id, entry);
    }
    return tenant;
};

const toSummary = (t) => t && ({ id: t.id.toString(), slug: t.slug, name: t.display_name, status: t.status });
const fresh = (entry) => entry && Date.now() - entry.at < TTL_MS;

const findTenantBySlug = async (slug) => {
    const hit = bySlug.get(slug);
    if (fresh(hit)) return hit.tenant;
    return remember(toSummary(await prisma.tenants.findUnique({ where: { slug } })));
};

const findTenantById = async (id) => {
    const key = String(id);
    const hit = byId.get(key);
    if (fresh(hit)) return hit.tenant;
    return remember(toSummary(await prisma.tenants.findUnique({ where: { id: BigInt(key) } })));
};

const clearTenantCache = () => { bySlug.clear(); byId.clear(); };

const tenantContext = async (req, _res, next) => {
    try {
        const slug = String(req.headers["x-tenant-slug"] || "").trim().toLowerCase();
        if (!slug) return next();
        if (!SLUG_RE.test(slug)) return next(fail("Hotel not found", "TENANT_NOT_FOUND", 404));

        const tenant = await findTenantBySlug(slug);
        if (!tenant) return next(fail("Hotel not found", "TENANT_NOT_FOUND", 404));
        if (tenant.status !== "ACTIVE") return next(fail("This hotel is currently unavailable.", "TENANT_SUSPENDED", 403));

        req.tenant = tenant;
        next();
    } catch (error) {
        next(error);
    }
};

/* Public hotel pages are meaningless without a hotel. */
const requireTenant = (req, _res, next) =>
    req.tenant ? next() : next(fail("A hotel must be specified (X-Tenant-Slug).", "TENANT_REQUIRED", 400));

module.exports = { tenantContext, requireTenant, findTenantBySlug, findTenantById, clearTenantCache, SLUG_RE };
