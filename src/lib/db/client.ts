import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

let database: ReturnType<typeof drizzle> | undefined;

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || process.env.DATABASE_PUBLIC_URL?.trim() || null;
}

export function getDatabase() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    if (process.env.NODE_ENV === "production" || process.env.DATABASE_REQUIRED === "1") {
      throw new Error("DATABASE_URL_REQUIRED");
    }
    return null;
  }
  if (!database) {
    const client = postgres(databaseUrl, {
      max: 4,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    });
    database = drizzle(client);
  }
  return database;
}

export async function checkDatabaseHealth() {
  const db = getDatabase();
  if (!db) return { configured: false, storage: "memory" as const };
  await db.execute(sql`select 1`);
  return { configured: true, storage: "postgresql" as const };
}
