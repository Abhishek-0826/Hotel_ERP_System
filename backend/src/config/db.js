const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const env = require("./env");

// Supabase terminates TLS with its own CA, so the connection is encrypted but not CA-verified.
const sslConfig = env.database.ssl ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({
    connectionString: env.database.url,
    ssl: sslConfig,
    max: env.database.poolMax,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
});

module.exports = prisma;
