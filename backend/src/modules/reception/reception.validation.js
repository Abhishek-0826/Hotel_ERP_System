const { z } = require("zod");

const id = z.union([z.string().regex(/^\d+$/), z.number().int().positive()]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

const registerGuestSchema = z.object({
  name: z.string().min(2).max(255), email: z.string().email().optional(), phone: z.string().regex(/^[6-9]\d{9}$/),
  idProofType: z.string().max(50).optional(), idProofNumber: z.string().max(100).optional(), address: z.string().max(1000).optional(),
  city: z.string().max(100).optional(), state: z.string().max(100).optional(), gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: date.optional(), emergencyContactName: z.string().max(255).optional(), emergencyContactPhone: z.string().regex(/^[6-9]\d{9}$/).optional(), notes: z.string().max(2000).optional(),
});

const createBookingSchema = z.object({
  guestId: id, propertyId: id, roomId: id, bedId: id, checkIn: date, checkOut: date,
  source: z.enum(["WALK_IN", "PHONE", "WEB"]).default("WALK_IN"),
});

const checkInSchema = z.object({
  idProofType: z.string().trim().min(2).max(50).optional(),
  idProofNumber: z.string().trim().min(3).max(100).optional(),
}).refine((value) => Boolean(value.idProofType) === Boolean(value.idProofNumber), "Provide both the ID document type and number");

module.exports = { registerGuestSchema, createBookingSchema, checkInSchema };
