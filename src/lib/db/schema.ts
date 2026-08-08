import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { ExcuseState } from "@/lib/types";

export const deviceSessions = pgTable("device_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey(),
  ownerHash: text("owner_hash").notNull(),
  caseNumber: integer("case_number").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  version: integer("version").notNull(),
  state: jsonb("state").$type<ExcuseState>().notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("cases_owner_updated_idx").on(table.ownerHash, table.updatedAt),
  uniqueIndex("cases_owner_number_idx").on(table.ownerHash, table.caseNumber),
]);

export const caseEvents = pgTable("case_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull(),
  idempotencyKey: uuid("idempotency_key").notNull(),
  action: text("action").notNull(),
  stateVersion: integer("state_version").notNull(),
  source: text("source").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  tokenUsage: integer("token_usage"),
  errorCategory: text("error_category"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("case_events_idempotency_idx").on(table.caseId, table.idempotencyKey)]);
