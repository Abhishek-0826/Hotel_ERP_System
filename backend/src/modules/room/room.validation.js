/* ─────────────────────────────────────────────────────────────────────────
   src/modules/room/room.validation.js
───────────────────────────────────────────────────────────────────────── */
const { z } = require("zod");

const createRoomSchema = z.object({
    tenantId:           z.union([z.string(), z.number()]).optional(),
    roomNumber:         z.string().max(50),
    floor:              z.number().int().optional(),
    genderPolicy:       z.enum(["MALE", "FEMALE", "MIXED"]).default("MIXED"),
    hasAc:              z.boolean().default(false),
    hasAttachedBathroom:z.boolean().default(false),
    basePrice:          z.number().positive("Base price must be positive"),
});

const updateRoomSchema = z.object({
    tenantId:           z.union([z.string(), z.number()]).optional(),
    roomNumber:         z.string().max(50).optional(),
    floor:              z.number().int().optional(),
    genderPolicy:       z.enum(["MALE", "FEMALE", "MIXED"]).optional(),
    hasAc:              z.boolean().optional(),
    hasAttachedBathroom:z.boolean().optional(),
    basePrice:          z.number().positive().optional(),
    status:             z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
});

module.exports = { createRoomSchema, updateRoomSchema };
