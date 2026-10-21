/* ─────────────────────────────────────────────────────────────────────────
   src/modules/tenant/tenant.service.js
   Hotels (tenants): public branding, owner self-service profile,
   platform-admin provisioning (create hotel + owner, suspend, reset owner).
───────────────────────────────────────────────────────────────────────── */
const prisma = require("../../config/db");
const env = require("../../config/env");
const supabaseAuth = require("../../lib/supabaseAuth");
const { clearTenantCache } = require("../../middleware/tenantContext");
const { recordAudit } = require("../../common/audit.service");

const LOGO_BUCKET = "tenant-logos";
const MAX_LOGO_BYTES = 500 * 1024;
const MAGIC = {
  "image/png": (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) => b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

const fail = (message, status, code) => {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
};

const publicTenant = (t) => ({
  slug: t.slug,
  name: t.display_name,
  tagline: t.tagline || null,
  description: t.description || null,
  logoUrl: t.logo_url || null,
  brandColor: t.brand_color || null,
  contactEmail: t.contact_email || null,
  contactPhone: t.contact_phone || t.whatsapp_number || null,
  address: [t.address, t.city, t.state, t.postal_code].filter(Boolean).join(", ") || null,
  website: t.website || null,
});

const fullTenant = (t) => ({
  id: t.id.toString(),
  ...publicTenant(t),
  legalName: t.legal_name,
  status: t.status,
  whatsappNumber: t.whatsapp_number || null,
  city: t.city || null,
  state: t.state || null,
  postalCode: t.postal_code || null,
  addressLine: t.address || null,
  onboardingCompleted: t.onboarding_completed,
  createdAt: t.created_at,
});

const loginUrlFor = (slug) => `${env.app.publicAppUrl}/${slug}/login`;

/* ── public ─────────────────────────────────────────────────────────── */

const getPublicBySlug = async (slug) => {
  const tenant = await prisma.tenants.findUnique({ where: { slug } });
  if (!tenant) throw fail("Hotel not found", 404, "TENANT_NOT_FOUND");
  if (tenant.status !== "ACTIVE") throw fail("This hotel is currently unavailable.", 403, "TENANT_SUSPENDED");
  return publicTenant(tenant);
};

/* ── owner ──────────────────────────────────────────────────────────── */

const requireOwnTenantId = (user) => {
  if (!user.tenantId) throw fail("User is not associated with a hotel", 400, "TENANT_REQUIRED");
  return BigInt(user.tenantId);
};

const getMine = async (user) => {
  const tenant = await prisma.tenants.findUnique({ where: { id: requireOwnTenantId(user) } });
  if (!tenant) throw fail("Hotel not found", 404, "TENANT_NOT_FOUND");
  return fullTenant(tenant);
};

const updateMine = async (user, data, req) => {
  const id = requireOwnTenantId(user);
  const current = await prisma.tenants.findUnique({ where: { id } });
  if (!current) throw fail("Hotel not found", 404, "TENANT_NOT_FOUND");

  const patch = {
    display_name: data.displayName,
    legal_name: data.legalName,
    tagline: data.tagline,
    description: data.description,
    contact_email: data.contactEmail,
    contact_phone: data.contactPhone,
    whatsapp_number: data.whatsappNumber,
    address: data.address,
    city: data.city,
    state: data.state,
    postal_code: data.postalCode,
    website: data.website,
    brand_color: data.brandColor,
  };
  const updateData = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));

  if (data.completeOnboarding) {
    const merged = { ...current, ...updateData };
    const missing = [];
    if (!merged.display_name) missing.push("hotel name");
    if (!merged.contact_phone) missing.push("contact phone");
    if (!merged.address || !merged.city) missing.push("address and city");
    if (missing.length) throw fail(`Please provide: ${missing.join(", ")}`, 400, "ONBOARDING_INCOMPLETE");
    updateData.onboarding_completed = true;
  }

  const updated = await prisma.tenants.update({ where: { id }, data: { ...updateData, updated_at: new Date() } });
  clearTenantCache();
  await recordAudit({ tenantId: id, userId: user.userId, action: "TENANT_PROFILE_UPDATED", entityType: "TENANT", entityId: id, req });
  return fullTenant(updated);
};

const setLogo = async (user, { contentType, dataBase64 }, req) => {
  const id = requireOwnTenantId(user);
  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length > MAX_LOGO_BYTES) throw fail("Logo must be 500 KB or smaller", 400, "LOGO_TOO_LARGE");
  if (!MAGIC[contentType](buffer)) throw fail("The file is not a valid image of that type", 400, "LOGO_INVALID");

  let logoUrl;
  if (supabaseAuth.adminEnabled()) {
    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    try {
      // Unique name per upload so browsers and CDNs never serve a stale logo.
      logoUrl = await supabaseAuth.uploadPublicFile(LOGO_BUCKET, `${id}/logo-${Date.now()}.${ext}`, buffer, contentType);
    } catch (error) {
      console.error(JSON.stringify({ level: "warn", event: "logo_storage_failed", message: error.message }));
      logoUrl = `data:${contentType};base64,${dataBase64}`; // keep the logo rather than failing onboarding
    }
  } else {
    // No storage credentials configured: keep the (small) image inline.
    logoUrl = `data:${contentType};base64,${dataBase64}`;
  }

  const updated = await prisma.tenants.update({ where: { id }, data: { logo_url: logoUrl, updated_at: new Date() } });
  clearTenantCache();
  await recordAudit({ tenantId: id, userId: user.userId, action: "TENANT_LOGO_UPDATED", entityType: "TENANT", entityId: id, req });
  return fullTenant(updated);
};

/* ── platform admin ─────────────────────────────────────────────────── */

const listForPlatform = async () => {
  const tenants = await prisma.tenants.findMany({
    orderBy: { created_at: "desc" },
    include: {
      users: { where: { role: "OWNER" }, select: { id: true, name: true, email: true, status: true, auth_user_id: true, must_change_password: true } },
      _count: { select: { properties: true, beds: true, bookings: true, users: true } },
    },
  });
  return tenants.map((t) => ({
    ...fullTenant(t),
    loginUrl: loginUrlFor(t.slug),
    counts: { properties: t._count.properties, beds: t._count.beds, bookings: t._count.bookings, users: t._count.users },
    owners: t.users.map((u) => ({
      id: u.id.toString(), name: u.name, email: u.email, status: u.status,
      hasLogin: Boolean(u.auth_user_id), mustChangePassword: u.must_change_password,
    })),
  }));
};

/* Creates (or re-sends) the owner's Supabase login. Returns { authUserId, delivery }. */
const provisionOwnerLogin = async ({ email, name, phone, slug, accessMode, temporaryPassword }) => {
  if (!supabaseAuth.adminEnabled()) {
    return { authUserId: null, delivery: "SIGNUP", mustChange: false };
  }
  const existing = await supabaseAuth.findAuthUserIdByEmail(email);
  if (accessMode === "password") {
    if (existing) {
      await supabaseAuth.setAuthPassword(existing, temporaryPassword);
      return { authUserId: existing, delivery: "PASSWORD", mustChange: true };
    }
    const authUserId = await supabaseAuth.createAuthUser({ email, password: temporaryPassword, name, phone });
    return { authUserId, delivery: "PASSWORD", mustChange: true };
  }
  if (existing) {
    // The person already has a login; they can use "Forgot password" at the hotel URL.
    return { authUserId: existing, delivery: "EXISTING_LOGIN", mustChange: false };
  }
  const authUserId = await supabaseAuth.inviteAuthUser({ email, name, redirectTo: `${env.app.publicAppUrl}/${slug}/reset-password` });
  return { authUserId, delivery: "INVITE_EMAIL", mustChange: false };
};

const createTenant = async (data, actor, req) => {
  const email = data.ownerEmail.toLowerCase();

  if (await prisma.tenants.findUnique({ where: { slug: data.slug } })) throw fail("That hotel address is already taken", 409, "SLUG_EXISTS");
  if (await prisma.users.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })) {
    throw fail("A user with the owner's email already exists", 409, "EMAIL_EXISTS");
  }

  const access = await provisionOwnerLogin({
    email, name: data.ownerName, phone: data.ownerPhone, slug: data.slug,
    accessMode: data.accessMode, temporaryPassword: data.temporaryPassword,
  });

  try {
    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenants.create({
        data: {
          display_name: data.displayName,
          legal_name: data.legalName || data.displayName,
          slug: data.slug,
          status: "ACTIVE",
          onboarding_completed: false,
          contact_email: email,
        },
      });
      await tx.users.create({
        data: {
          tenant_id: created.id,
          name: data.ownerName,
          email,
          phone: data.ownerPhone || null,
          role: "OWNER",
          status: "ACTIVE",
          auth_user_id: access.authUserId,
          must_change_password: access.mustChange,
          password_hash: null,
        },
      });
      return created;
    });
    await recordAudit({ tenantId: tenant.id, userId: actor.userId, action: "TENANT_CREATED", entityType: "TENANT", entityId: tenant.id, newValues: { slug: data.slug, owner: email }, req });
    return {
      tenant: fullTenant(tenant),
      loginUrl: loginUrlFor(tenant.slug),
      ownerEmail: email,
      delivery: access.delivery,
      // Shown once so the platform admin can pass it on; never stored in clear text.
      temporaryPassword: access.delivery === "PASSWORD" ? data.temporaryPassword : undefined,
    };
  } catch (error) {
    // Do not leave a dangling Supabase login behind when the database write failed.
    if (access.authUserId && access.delivery !== "EXISTING_LOGIN") await supabaseAuth.deleteAuthUser(access.authUserId).catch(() => {});
    throw error;
  }
};

const updateForPlatform = async (tenantId, data, actor, req) => {
  const id = BigInt(tenantId);
  const current = await prisma.tenants.findUnique({ where: { id } });
  if (!current) throw fail("Hotel not found", 404, "TENANT_NOT_FOUND");
  const updated = await prisma.tenants.update({
    where: { id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.displayName ? { display_name: data.displayName } : {}),
      updated_at: new Date(),
    },
  });
  clearTenantCache();
  await recordAudit({ tenantId: id, userId: actor.userId, action: "TENANT_UPDATED", entityType: "TENANT", entityId: id, oldValues: { status: current.status }, newValues: data, req });
  return fullTenant(updated);
};

/* Re-sends the invite email, or sets a new temporary password, for the hotel's owner. */
const resetOwnerAccess = async (tenantId, data, actor, req) => {
  const id = BigInt(tenantId);
  const tenant = await prisma.tenants.findUnique({ where: { id } });
  if (!tenant) throw fail("Hotel not found", 404, "TENANT_NOT_FOUND");
  const owner = await prisma.users.findFirst({ where: { tenant_id: id, role: "OWNER" }, orderBy: { id: "asc" } });
  if (!owner) throw fail("This hotel has no owner account", 404, "OWNER_NOT_FOUND");
  if (!supabaseAuth.adminEnabled()) {
    throw fail("Set SUPABASE_SERVICE_ROLE_KEY on the API to send invites or set passwords. Otherwise the owner can use Sign up / Forgot password.", 400, "SERVICE_KEY_REQUIRED");
  }

  const access = await provisionOwnerLogin({
    email: owner.email.toLowerCase(), name: owner.name, phone: owner.phone, slug: tenant.slug,
    accessMode: data.accessMode, temporaryPassword: data.temporaryPassword,
  });
  await prisma.users.update({
    where: { id: owner.id },
    data: { auth_user_id: owner.auth_user_id || access.authUserId, must_change_password: access.mustChange, updated_at: new Date() },
  });
  await recordAudit({ tenantId: id, userId: actor.userId, action: "TENANT_OWNER_ACCESS_RESET", entityType: "USER", entityId: owner.id, req });
  return {
    ownerEmail: owner.email,
    loginUrl: loginUrlFor(tenant.slug),
    delivery: access.delivery,
    temporaryPassword: access.delivery === "PASSWORD" ? data.temporaryPassword : undefined,
  };
};

module.exports = {
  getPublicBySlug, getMine, updateMine, setLogo,
  listForPlatform, createTenant, updateForPlatform, resetOwnerAccess,
};
