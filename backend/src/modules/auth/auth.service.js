/* ─────────────────────────────────────────────────────────────────────────
   src/modules/auth/auth.service.js

   register / login / adminLogin /
   getProfile / changePassword

   Supported database roles:
   GUEST
   OWNER
   STAFF
   PLATFORM_ADMIN
───────────────────────────────────────────────────────────────────────── */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/db");
const env = require("../../config/env");

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────── */

const SALT_ROUNDS = 12;
const ADMIN_ROLE = "PLATFORM_ADMIN";

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */

const signToken = (user) => {
    return jwt.sign(
        {
            userId: user.id.toString(),
            email: user.email,
            role: user.role,
            tenantId: user.tenant_id
                ? user.tenant_id.toString()
                : null,
        },
        env.jwt.secret,
        {
            expiresIn: env.jwt.expiresIn,
        }
    );
};

const formatUser = (user, tenant = user.tenants) => {
    return {
        mustChangePassword: Boolean(user.must_change_password),
        tenant: tenant
            ? {
                  id: tenant.id.toString(),
                  slug: tenant.slug,
                  name: tenant.display_name,
                  logoUrl: tenant.logo_url || null,
                  onboardingCompleted: Boolean(tenant.onboarding_completed),
              }
            : null,
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        status: user.status,
        tenantId: user.tenant_id
            ? user.tenant_id.toString()
            : null,
    };
};

/* ─────────────────────────────────────────────────────────────────────────
   REGISTER
   Normal user registration
───────────────────────────────────────────────────────────────────────── */

const register = async ({
    name,
    email,
    phone,
    password,
}) => {
    const existing = await prisma.users.findUnique({
        where: {
            email,
        },
    });

    if (existing) {
        const err = new Error("Email already registered");
        err.status = 409;
        err.code = "EMAIL_EXISTS";
        throw err;
    }

    const passwordHash = await bcrypt.hash(
        password,
        SALT_ROUNDS
    );

    const user = await prisma.users.create({
        data: {
            name,
            email,
            phone: phone || null,
            password_hash: passwordHash,
            role: "GUEST",
            status: "ACTIVE",
            tenant_id: null,
        },
    });

    return {
        user: formatUser(user),
        token: signToken(user),
    };
};

/* ─────────────────────────────────────────────────────────────────────────
   LOGIN
   Normal user login
───────────────────────────────────────────────────────────────────────── */

const login = async ({
    email,
    password,
}) => {
    const user = await prisma.users.findUnique({
        where: {
            email,
        },
    });

    const isValid =
        user && user.password_hash
            ? await bcrypt.compare(
                  password,
                  user.password_hash
              )
            : false;

    if (!user || !isValid) {
        const err = new Error(
            "Invalid email or password"
        );

        err.status = 401;
        err.code = "INVALID_CREDENTIALS";

        throw err;
    }

    if (user.status !== "ACTIVE") {
        const err = new Error(
            "Account is suspended. Contact support."
        );

        err.status = 403;
        err.code = "ACCOUNT_SUSPENDED";

        throw err;
    }

    return {
        user: formatUser(user),
        token: signToken(user),
    };
};

/* ─────────────────────────────────────────────────────────────────────────
   ADMIN REGISTER
   Creates a PLATFORM_ADMIN user

   IMPORTANT:
   Database constraint allows:
   GUEST
   OWNER
   STAFF
   PLATFORM_ADMIN

   Therefore DO NOT use "ADMIN".
───────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────
   ADMIN LOGIN
   Only PLATFORM_ADMIN users can login here
───────────────────────────────────────────────────────────────────────── */

const adminLogin = async ({
    email,
    password,
}) => {
    const user = await prisma.users.findUnique({
        where: {
            email,
        },
    });

    /*
     * Only PLATFORM_ADMIN can use admin login.
     */
    if (
        !user ||
        ![ADMIN_ROLE, "ADMIN"].includes(user.role) ||
        !user.password_hash
    ) {
        const err = new Error(
            "Invalid admin email or password"
        );

        err.status = 401;
        err.code = "INVALID_ADMIN_CREDENTIALS";

        throw err;
    }

    const isValid = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!isValid) {
        const err = new Error(
            "Invalid admin email or password"
        );

        err.status = 401;
        err.code = "INVALID_ADMIN_CREDENTIALS";

        throw err;
    }

    if (user.status !== "ACTIVE") {
        const err = new Error(
            "Admin account is suspended. Contact support."
        );

        err.status = 403;
        err.code = "ACCOUNT_SUSPENDED";

        throw err;
    }

    return {
        user: formatUser(user),
        token: signToken(user),
    };
};

/* ─────────────────────────────────────────────────────────────────────────
   GET PROFILE
───────────────────────────────────────────────────────────────────────── */

const getProfile = async (userId) => {
    const user = await prisma.users.findUnique({
        where: {
            id: BigInt(userId),
        },
        include: { tenants: true },
    });

    if (!user) {
        const err = new Error(
            "User not found"
        );

        err.status = 404;
        err.code = "NOT_FOUND";

        throw err;
    }

    return formatUser(user);
};

/* ─────────────────────────────────────────────────────────────────────────
   CHANGE PASSWORD
───────────────────────────────────────────────────────────────────────── */

const changePassword = async (
    userId,
    {
        oldPassword,
        newPassword,
    }
) => {
    const user = await prisma.users.findUnique({
        where: {
            id: BigInt(userId),
        },
    });

    if (!user || !user.password_hash) {
        const err = new Error(
            "User not found"
        );

        err.status = 404;
        err.code = "NOT_FOUND";

        throw err;
    }

    const isValid = await bcrypt.compare(
        oldPassword,
        user.password_hash
    );

    if (!isValid) {
        const err = new Error(
            "Old password is incorrect"
        );

        err.status = 400;
        err.code = "INVALID_OLD_PASSWORD";

        throw err;
    }

    const newHash = await bcrypt.hash(
        newPassword,
        SALT_ROUNDS
    );

    await prisma.users.update({
        where: {
            id: BigInt(userId),
        },

        data: {
            password_hash: newHash,
            updated_at: new Date(),
        },
    });

    return {
        message:
            "Password changed successfully",
    };
};

/* Clears the "must change password" flag after the user sets their own. */
const markPasswordUpdated = async (userId) => {
    await prisma.users.update({
        where: { id: BigInt(userId) },
        data: { must_change_password: false, updated_at: new Date() },
    });
    return { message: "Password updated" };
};

/* ─────────────────────────────────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────────────────────────────────── */

module.exports = {
    register,
    login,
    adminLogin,
    getProfile,
    changePassword,
    markPasswordUpdated,
};
