const { z } = require("zod");
const id = z.union([z.string().regex(/^\d+$/), z.number().int().positive()]);
const feedbackSchema = z.object({ bookingId: id.optional(), guestId: id.optional(), overallRating: z.coerce.number().int().min(1).max(5), cleanlinessRating: z.coerce.number().int().min(1).max(5).optional(), serviceRating: z.coerce.number().int().min(1).max(5).optional(), valueRating: z.coerce.number().int().min(1).max(5).optional(), comment: z.string().max(2000).optional() });
const complaintSchema = z.object({ bookingId: id.optional(), guestId: id.optional(), category: z.enum(["CLEANLINESS", "NOISE", "MAINTENANCE", "SERVICE", "FOOD", "SAFETY", "OTHER"]), subject: z.string().min(3).max(255), description: z.string().min(5).max(5000), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM") });
const complaintUpdateSchema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]), assignedTo: id.optional(), resolution: z.string().max(5000).optional() });
module.exports = { feedbackSchema, complaintSchema, complaintUpdateSchema };
