import { afterEach, describe, expect, it, vi } from "vitest";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalPublicUrl = process.env.DATABASE_PUBLIC_URL;
const originalRequired = process.env.DATABASE_REQUIRED;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalPublicUrl === undefined) delete process.env.DATABASE_PUBLIC_URL;
  else process.env.DATABASE_PUBLIC_URL = originalPublicUrl;
  if (originalRequired === undefined) delete process.env.DATABASE_REQUIRED;
  else process.env.DATABASE_REQUIRED = originalRequired;
  vi.resetModules();
});

describe("database configuration", () => {
  it("prefers Railway's private DATABASE_URL and supports its public URL locally", async () => {
    process.env.DATABASE_URL = "postgres://private.example/app";
    process.env.DATABASE_PUBLIC_URL = "postgres://public.example/app";
    const { getDatabaseUrl } = await import("@/lib/db/client");
    expect(getDatabaseUrl()).toBe("postgres://private.example/app");

    delete process.env.DATABASE_URL;
    expect(getDatabaseUrl()).toBe("postgres://public.example/app");
  });

  it("refuses ephemeral storage when persistence is required", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_PUBLIC_URL;
    process.env.DATABASE_REQUIRED = "1";
    const { getDatabase } = await import("@/lib/db/client");
    expect(() => getDatabase()).toThrow("DATABASE_URL_REQUIRED");
  });
});
