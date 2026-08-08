import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let database: ReturnType<typeof drizzle> | undefined;

export function getDatabase() {
  if (!process.env.DATABASE_URL) return null;
  if (!database) {
    const client = postgres(process.env.DATABASE_URL, { max: 4, prepare: false });
    database = drizzle(client);
  }
  return database;
}
