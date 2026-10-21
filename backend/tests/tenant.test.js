const test = require("node:test");
const assert = require("node:assert/strict");
const { createTenantSchema, updateTenantSchema, logoSchema } = require("../src/modules/tenant/tenant.validation");

const base = { displayName: "Sunrise Stay", slug: "sunrise-stay", ownerName: "Asha Rao", ownerEmail: "asha@example.com" };

test("hotel slugs are lowercase url-safe words", () => {
  assert.equal(createTenantSchema.safeParse(base).success, true);
  assert.equal(createTenantSchema.parse({ ...base, slug: "  Sunrise-Stay " }).slug, "sunrise-stay");
  for (const slug of ["ab", "has space", "-lead", "trail-", "under_score", "a".repeat(60)]) {
    assert.equal(createTenantSchema.safeParse({ ...base, slug }).success, false, slug);
  }
});

test("reserved addresses cannot become hotels", () => {
  for (const slug of ["platform", "admin", "api", "login", "owner"]) {
    assert.equal(createTenantSchema.safeParse({ ...base, slug }).success, false, slug);
  }
});

test("temporary password mode needs a 12+ character password", () => {
  assert.equal(createTenantSchema.safeParse({ ...base, accessMode: "password" }).success, false);
  assert.equal(createTenantSchema.safeParse({ ...base, accessMode: "password", temporaryPassword: "short" }).success, false);
  assert.equal(createTenantSchema.safeParse({ ...base, accessMode: "password", temporaryPassword: "Temp-Password-12" }).success, true);
  assert.equal(createTenantSchema.parse(base).accessMode, "invite");
});

test("owner profile update validates colour and contact fields", () => {
  assert.equal(updateTenantSchema.safeParse({ brandColor: "#6256d9", contactPhone: "9876543210" }).success, true);
  assert.equal(updateTenantSchema.safeParse({ brandColor: "red" }).success, false);
  assert.equal(updateTenantSchema.safeParse({ website: "not a url" }).success, false);
  assert.equal(updateTenantSchema.parse({ website: "" }).website, undefined);
});

test("logo uploads accept only png/jpeg/webp", () => {
  const dataBase64 = "A".repeat(200);
  assert.equal(logoSchema.safeParse({ contentType: "image/png", dataBase64 }).success, true);
  assert.equal(logoSchema.safeParse({ contentType: "image/svg+xml", dataBase64 }).success, false);
});
