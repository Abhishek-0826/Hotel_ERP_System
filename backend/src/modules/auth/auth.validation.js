const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number").optional(),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const adminLoginSchema = loginSchema;
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(12, "Password must be at least 12 characters"),
});
const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number").optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  emailOrPhone: z.string().trim().optional(),
}).refine((data) => data.email || data.phone || data.emailOrPhone, {
  message: "Either email or phone is required",
});

module.exports = {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
};
