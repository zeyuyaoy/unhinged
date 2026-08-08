import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL?.trim()
  || process.env.DATABASE_PUBLIC_URL?.trim()
  || "postgres://localhost/maximum_extra";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
});
