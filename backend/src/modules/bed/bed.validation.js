/* ─────────────────────────────────────────────────────────────────────────
   src/modules/bed/bed.validation.js
───────────────────────────────────────────────────────────────────────── */
const { z } = require("zod");

const createBedSchema = z.object({
    tenantId:      z.union([z.string(), z.number()]).optional(),
    bedCode:       z.string().max(50),
    position:      z.enum(["UPPER", "LOWER", "SINGLE"]).optional(),
    priceOverride: z.number().positive().optional(),
});

const updateBedSchema = z.object({
    tenantId:      z.union([z.string(), z.number()]).optional(),
    bedCode:       z.string().max(50).optional(),
    position:      z.enum(["UPPER", "LOWER", "SINGLE"]).optional(),
    priceOverride: z.number().positive().nullable().optional(),
    status:        z.enum(["AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE"]).optional(),
});

module.exports = { createBedSchema, updateBedSchema };
