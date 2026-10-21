import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` (run on postinstall) never connects, so it must not fail when
// DATABASE_URL is missing. Every other command (migrate, db, ...) needs a real URL.
const isGenerate = process.argv.includes("generate");

if (!process.env.DATABASE_URL && !isGenerate) {
  throw new Error(
    "DATABASE_URL is not set. Create backend/.env (copy backend/.env.example) and set DATABASE_URL to your Supabase Session pooler connection string."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
