const { z } = require("zod");

// URL segments that must never become a hotel address.
const RESERVED_SLUGS = new Set([
  "platform", "admin", "api", "login", "register", "owner", "static", "assets", "auth", "www", "app",
  "support", "help", "billing", "status", "docs", "roost", "properties", "rooms", "bookings", "dashboard",
]);

const slugSchema = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/, "Use 3-50 lowercase letters, numbers or hyphens")
  .refine((slug) => !RESERVED_SLUGS.has(slug), "This address is reserved");

const phone = z.string().trim().regex(/^[0-9+\-\s]{7,20}$/, "Enter a valid phone number");
const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));

const createTenantSchema = z.object({
  displayName: z.string().trim().min(2).max(255),
  legalName: z.string().trim().min(2).max(255).optional(),
  slug: slugSchema,
  ownerName: z.string().trim().min(2).max(255),
  ownerEmail: z.string().trim().email().max(255),
  ownerPhone: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number").optional(),
  // invite = Supabase emails the owner a set-password link; password = you share a temporary password.
  accessMode: z.enum(["invite", "password"]).default("invite"),
  temporaryPassword: z.string().min(12).max(128).optional(),
}).refine((d) => d.accessMode !== "password" || d.temporaryPassword, {
  message: "temporaryPassword is required when accessMode is password",
  path: ["temporaryPassword"],
});

const platformTenantUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  displayName: z.string().trim().min(2).max(255).optional(),
});

const ownerResetSchema = z.object({
  accessMode: z.enum(["invite", "password"]).default("invite"),
  temporaryPassword: z.string().min(12).max(128).optional(),
}).refine((d) => d.accessMode !== "password" || d.temporaryPassword, {
  message: "temporaryPassword is required when accessMode is password",
  path: ["temporaryPassword"],
});

const updateTenantSchema = z.object({
  displayName: z.string().trim().min(2).max(255).optional(),
  legalName: z.string().trim().min(2).max(255).optional(),
  tagline: optionalText(255),
  description: optionalText(2000),
  contactEmail: z.string().trim().email().max(255).optional().or(z.literal("").transform(() => undefined)),
  contactPhone: phone.optional(),
  whatsappNumber: optionalText(20),
  address: optionalText(500),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(20),
  website: z.string().trim().url().max(255).optional().or(z.literal("").transform(() => undefined)),
  brandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #6256d9").optional(),
  completeOnboarding: z.boolean().optional(),
});

const logoSchema = z.object({
  contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  dataBase64: z.string().min(100).max(900_000),
});

module.exports = { createTenantSchema, platformTenantUpdateSchema, ownerResetSchema, updateTenantSchema, logoSchema, RESERVED_SLUGS };
