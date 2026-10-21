const { z } = require("zod");

const status = z.enum(["ONLINE", "OFFLINE", "MAINTENANCE"]);

const createCameraSchema = z.object({
  name: z.string().trim().min(2).max(255),
  location: z.string().trim().min(2).max(255),
  status: status.default("ONLINE"),
  streamUrl: z.string().url().max(2048).optional(),
});

const updateCameraSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  location: z.string().trim().min(2).max(255).optional(),
  status: status.optional(),
  streamUrl: z.string().url().max(2048).nullable().optional(),
}).refine((body) => Object.keys(body).length > 0, "At least one field is required");

module.exports = { createCameraSchema, updateCameraSchema };
