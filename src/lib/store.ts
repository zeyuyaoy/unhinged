import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db/client";
import { caseEvents, cases, deviceSessions } from "@/lib/db/schema";
import { normalizeLegacyLoreState } from "@/lib/chaos-engine";
import type { CaseSummary, ExcuseState } from "@/lib/types";

const memoryCases = new Map<string, { ownerHash: string; title: string; state: ExcuseState }>();
const memoryEvents = new Map<string, ExcuseState>();

export class VersionConflictError extends Error {}
export class NotFoundError extends Error {}

export async function ensureDeviceSession(ownerHash: string) {
  const db = getDatabase();
  if (!db) return;
  await db.insert(deviceSessions).values({ tokenHash: ownerHash }).onConflictDoUpdate({
    target: deviceSessions.tokenHash,
    set: { lastSeenAt: new Date() },
  });
}

export async function nextCaseNumber(ownerHash: string) {
  const db = getDatabase();
  if (!db) {
    const count = [...memoryCases.values()].filter((item) => item.ownerHash === ownerHash).length;
    return count + 1;
  }
  const [latest] = await db.select({ caseNumber: cases.caseNumber }).from(cases)
    .where(eq(cases.ownerHash, ownerHash)).orderBy(desc(cases.caseNumber)).limit(1);
  return (latest?.caseNumber ?? 0) + 1;
}

export async function createCase(ownerHash: string, title: string, state: ExcuseState) {
  const db = getDatabase();
  if (!db) {
    memoryCases.set(state.id, { ownerHash, title, state });
    return state;
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ownerHash}))`);
    const [latest] = await tx.select({ caseNumber: cases.caseNumber }).from(cases)
      .where(eq(cases.ownerHash, ownerHash)).orderBy(desc(cases.caseNumber)).limit(1);
    const persistedState = { ...state, caseNumber: (latest?.caseNumber ?? 0) + 1 };
    await tx.insert(cases).values({
      id: persistedState.id,
      ownerHash,
      caseNumber: persistedState.caseNumber,
      title,
      status: persistedState.status,
      version: persistedState.version,
      state: persistedState,
    });
    return persistedState;
  });
}

export async function listCases(ownerHash: string): Promise<CaseSummary[]> {
  const db = getDatabase();
  if (!db) {
    return [...memoryCases.entries()]
      .filter(([, item]) => item.ownerHash === ownerHash)
      .map(([id, item]) => ({
        id,
        caseNumber: item.state.caseNumber,
        title: item.title,
        status: item.state.status,
        chaosLevel: item.state.chaosLevel,
        updatedAt: item.state.updatedAt,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const rows = await db.select().from(cases).where(eq(cases.ownerHash, ownerHash)).orderBy(desc(cases.updatedAt)).limit(20);
  return rows.map((row) => ({
    id: row.id,
    caseNumber: row.caseNumber,
    title: row.title,
    status: row.status as ExcuseState["status"],
    chaosLevel: row.state.chaosLevel,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getCase(ownerHash: string, id: string) {
  const db = getDatabase();
  if (!db) {
    const item = memoryCases.get(id);
    if (!item || item.ownerHash !== ownerHash) throw new NotFoundError();
    return normalizeLegacyLoreState(item.state);
  }
  const [row] = await db.select().from(cases).where(and(eq(cases.id, id), eq(cases.ownerHash, ownerHash))).limit(1);
  if (!row) throw new NotFoundError();
  return normalizeLegacyLoreState(row.state);
}

export async function getCaseReplay(ownerHash: string, id: string, idempotencyKey: string) {
  const db = getDatabase();
  if (!db) {
    const item = memoryCases.get(id);
    const replay = memoryEvents.get(`${id}:${idempotencyKey}`);
    if (!item || item.ownerHash !== ownerHash || !replay) return null;
    return normalizeLegacyLoreState(item.state);
  }
  const [event] = await db.select({ id: caseEvents.id }).from(caseEvents).where(and(
    eq(caseEvents.caseId, id),
    eq(caseEvents.idempotencyKey, idempotencyKey),
  )).limit(1);
  if (!event) return null;
  const [row] = await db.select().from(cases).where(and(eq(cases.id, id), eq(cases.ownerHash, ownerHash))).limit(1);
  return row ? normalizeLegacyLoreState(row.state) : null;
}

export async function commitCase(input: {
  ownerHash: string;
  state: ExcuseState;
  expectedVersion: number;
  idempotencyKey: string;
  action: string;
  source: "live" | "local" | "fallback";
  latencyMs: number;
  tokenUsage?: number;
  errorCategory?: string;
}) {
  const db = getDatabase();
  const replayKey = `${input.state.id}:${input.idempotencyKey}`;
  if (!db) {
    const replay = memoryEvents.get(replayKey);
    if (replay) return replay;
    const item = memoryCases.get(input.state.id);
    if (!item || item.ownerHash !== input.ownerHash) throw new NotFoundError();
    if (item.state.version !== input.expectedVersion) throw new VersionConflictError();
    memoryCases.set(input.state.id, { ...item, state: input.state });
    memoryEvents.set(replayKey, input.state);
    return input.state;
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.state.id}))`);
    const [replay] = await tx.select().from(caseEvents).where(and(
      eq(caseEvents.caseId, input.state.id),
      eq(caseEvents.idempotencyKey, input.idempotencyKey),
    )).limit(1);
    if (replay) {
      const [current] = await tx.select().from(cases).where(eq(cases.id, input.state.id)).limit(1);
      if (!current || current.ownerHash !== input.ownerHash) throw new NotFoundError();
      return current.state;
    }
    const [current] = await tx.select().from(cases).where(and(
      eq(cases.id, input.state.id),
      eq(cases.ownerHash, input.ownerHash),
    )).limit(1);
    if (!current) throw new NotFoundError();
    if (current.version !== input.expectedVersion) throw new VersionConflictError();
    await tx.update(cases).set({
      state: input.state,
      version: input.state.version,
      status: input.state.status,
      savedAt: input.action === "save_case" ? new Date() : current.savedAt,
      updatedAt: new Date(),
    }).where(eq(cases.id, input.state.id));
    await tx.insert(caseEvents).values({
      id: randomUUID(),
      caseId: input.state.id,
      idempotencyKey: input.idempotencyKey,
      action: input.action,
      stateVersion: input.state.version,
      source: input.source,
      latencyMs: input.latencyMs,
      tokenUsage: input.tokenUsage,
      errorCategory: input.errorCategory,
    });
    return input.state;
  });
}

export async function deleteCases(ownerHash: string) {
  const db = getDatabase();
  if (!db) {
    for (const [id, item] of memoryCases.entries()) {
      if (item.ownerHash === ownerHash) memoryCases.delete(id);
    }
    return;
  }
  await db.delete(cases).where(eq(cases.ownerHash, ownerHash));
}
