const { z } = require("zod");

const createPropertySchema = z.object({
    tenantId: z.union([z.string(), z.number()]).optional(),

    name: z.string().min(2).max(255),

    slug: z
        .string()
        .min(2)
        .max(150)
        .regex(
            /^[a-z0-9-]+$/,
            "Slug must be lowercase alphanumeric with dashes"
        ),

    description: z.string().optional(),

    address: z.string().optional(),

    city: z.string().max(100).optional(),
    area: z.string().max(100).optional(),

    state: z.string().max(100).optional(),

    postalCode: z.string().max(20).optional(),

    latitude: z.number().min(-90).max(90).optional(),

    longitude: z.number().min(-180).max(180).optional(),
    type: z.enum(["PG", "HOSTEL", "CO_LIVING", "DORMITORY"]).default("PG"),
    genderPolicy: z.enum(["MIXED", "MALE", "FEMALE"]).default("MIXED"),
    price: z.number().nonnegative().optional(),
    startingPrice: z.number().nonnegative().optional(),
    rating: z.number().min(0).max(5).optional(),
    reviews: z.number().int().nonnegative().optional(),
    featured: z.boolean().optional(),
});

const updatePropertySchema = z.object({
    tenantId: z.union([z.string(), z.number()]).optional(),

    name: z.string().min(2).max(255).optional(),

    description: z.string().optional(),

    address: z.string().optional(),

    city: z.string().max(100).optional(),
    area: z.string().max(100).optional(),

    state: z.string().max(100).optional(),

    postalCode: z.string().max(20).optional(),

    latitude: z.number().min(-90).max(90).optional(),

    longitude: z.number().min(-180).max(180).optional(),
    type: z.enum(["PG", "HOSTEL", "CO_LIVING", "DORMITORY"]).optional(),
    genderPolicy: z.enum(["MIXED", "MALE", "FEMALE"]).optional(),
    price: z.number().nonnegative().nullable().optional(),
    startingPrice: z.number().nonnegative().nullable().optional(),
    rating: z.number().min(0).max(5).optional(),
    reviews: z.number().int().nonnegative().optional(),
    featured: z.boolean().optional(),
});

const updatePropertyStatusSchema = z.object({
    tenantId: z.union([z.string(), z.number()]).optional(),

    status: z.enum([
        "DRAFT",
        "PUBLISHED",
        "ACTIVE",
    ]),
});

module.exports = {
    createPropertySchema,
    updatePropertySchema,
    updatePropertyStatusSchema,
};
