import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("case persistence compatibility", () => {
  it("normalizes legacy cases while preserving ownership, versioning, and idempotency", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DATABASE_PUBLIC_URL", "");
    vi.stubEnv("DATABASE_REQUIRED", "");
    const { applyFallbackAction, createFallbackState, PRIMARY_LORE_ID } = await import("@/lib/chaos-engine");
    const { commitCase, createCase, getCase, NotFoundError, VersionConflictError } = await import("@/lib/store");
    const ownerHash = "owner-a";
    const original = createFallbackState({
      id: "23f27c50-9f98-44c8-b2e9-4e945f2c8066",
      caseNumber: 1,
      scenario: "I need an excuse for missing my assignment.",
      audience: "teacher",
      userRole: "student",
      genre: "normal",
      startingChaos: 1,
    });
    const legacy = {
      ...original,
      currentExcuse: "Raymond took the assignment to the aquarium.",
      lore: [{ id: PRIMARY_LORE_ID, type: "character" as const, name: "Raymond", role: "Alleged uncle", description: "Raymond appeared.", importance: 0.8 }],
    };
    await createCase(ownerHash, "Legacy case", legacy);

    const restored = await getCase(ownerHash, legacy.id);
    expect(restored.version).toBe(1);
    expect(restored.currentExcuse).toContain("Emergency Backup Pigeon");
    expect(restored.lore[0].name).toBe("Emergency Backup Pigeon");
    await expect(getCase("owner-b", legacy.id)).rejects.toBeInstanceOf(NotFoundError);

    const next = applyFallbackAction(restored, { type: "add_detail" }, "local");
    const committed = await commitCase({
      ownerHash,
      state: next,
      expectedVersion: restored.version,
      idempotencyKey: "17ac3cd6-3495-486c-890c-a3bb9a8f64a5",
      action: "add_detail",
      source: "local",
      latencyMs: 1,
    });
    expect(committed.version).toBe(2);
    expect((await getCase(ownerHash, legacy.id)).currentExcuse).not.toContain("Raymond");

    const replay = await commitCase({
      ownerHash,
      state: next,
      expectedVersion: restored.version,
      idempotencyKey: "17ac3cd6-3495-486c-890c-a3bb9a8f64a5",
      action: "add_detail",
      source: "local",
      latencyMs: 1,
    });
    expect(replay).toEqual(committed);

    await expect(commitCase({
      ownerHash,
      state: next,
      expectedVersion: restored.version,
      idempotencyKey: "d28ef7d1-2196-47a9-bfdb-af0df31a669c",
      action: "add_detail",
      source: "local",
      latencyMs: 1,
    })).rejects.toBeInstanceOf(VersionConflictError);
  });
});
