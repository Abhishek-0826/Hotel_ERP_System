/* ─────────────────────────────────────────────────────────────────────────
   src/modules/booking/booking.validation.js
───────────────────────────────────────────────────────────────────────── */
const { z } = require("zod");

const createBookingSchema = z.object({
    propertyId: z.union([z.string(), z.number()]),
    roomId:     z.union([z.string(), z.number()]),
    bedId:      z.union([z.string(), z.number()]),
    checkIn:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
    checkOut:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
    guestName:  z.string().min(2).max(255),

    guestPhone: z
        .string()
        .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),

    guestEmail: z.string().trim().email(),
    source:     z.enum(["WEB", "WALK_IN", "PHONE"]).default("WEB"),
});

const rejectBookingSchema = z.object({
    reason: z.string().min(5, "Rejection reason must be at least 5 characters"),
});

const cancelBookingSchema = z.object({
    reason: z.string().optional(),
    guestEmail: z.string().trim().email().optional(),
});

module.exports = { createBookingSchema, rejectBookingSchema, cancelBookingSchema };
