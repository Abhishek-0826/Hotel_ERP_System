/* ─────────────────────────────────────────────────────────────────────────
   src/modules/tenant/tenant.routes.js

   PUBLIC     GET   /api/v1/public/tenants/:slug        hotel branding for /<slug>
   OWNER      GET   /api/v1/tenant/me                   own hotel profile
              PATCH /api/v1/tenant/me                   update profile / finish onboarding
              POST  /api/v1/tenant/me/logo              upload logo (base64 JSON)
   PLATFORM   GET   /api/v1/platform/tenants
              POST  /api/v1/platform/tenants            create hotel + owner login
              PATCH /api/v1/platform/tenants/:id        suspend / activate / rename
              POST  /api/v1/platform/tenants/:id/owner-access   re-invite or temp password
───────────────────────────────────────────────────────────────────────── */
const express = require("express");
const svc = require("./tenant.service");
const validate = require("../../middleware/validate");
const { authenticate, requireRole } = require("../../middleware/auth");
const { requirePermission } = require("../../common/rbac");
const { SLUG_RE } = require("../../middleware/tenantContext");
const {
  createTenantSchema, platformTenantUpdateSchema, ownerResetSchema, updateTenantSchema, logoSchema,
} = require("./tenant.validation");

const wrap = (fn, status = 200) => async (req, res, next) => {
  try {
    res.status(status).json({ success: true, data: await fn(req) });
  } catch (error) {
    next(error);
  }
};

/* public */
const publicRouter = express.Router();
publicRouter.get("/:slug", wrap((req) => {
  const slug = String(req.params.slug).toLowerCase();
  if (!SLUG_RE.test(slug)) {
    const err = new Error("Hotel not found");
    err.status = 404;
    err.code = "TENANT_NOT_FOUND";
    throw err;
  }
  return svc.getPublicBySlug(slug);
}));

/* owner (the hotel's own profile) */
const ownerRouter = express.Router();
ownerRouter.use(authenticate, requireRole("OWNER"));
ownerRouter.get("/me", wrap((req) => svc.getMine(req.user)));
ownerRouter.patch("/me", requirePermission("settings:write"), validate(updateTenantSchema), wrap((req) => svc.updateMine(req.user, req.body, req)));
ownerRouter.post("/me/logo", requirePermission("settings:write"), validate(logoSchema), wrap((req) => svc.setLogo(req.user, req.body, req)));

/* platform admin */
const platformRouter = express.Router();
platformRouter.use(authenticate, requireRole("PLATFORM_ADMIN", "ADMIN"));
platformRouter.get("/tenants", wrap(() => svc.listForPlatform()));
platformRouter.post("/tenants", validate(createTenantSchema), wrap((req) => svc.createTenant(req.body, req.user, req), 201));
platformRouter.patch("/tenants/:id", validate(platformTenantUpdateSchema), wrap((req) => svc.updateForPlatform(req.params.id, req.body, req.user, req)));
platformRouter.post("/tenants/:id/owner-access", validate(ownerResetSchema), wrap((req) => svc.resetOwnerAccess(req.params.id, req.body, req.user, req)));

module.exports = { publicRouter, ownerRouter, platformRouter };
