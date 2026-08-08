import { z } from "zod";

export const audienceSchema = z.enum(["teacher", "parent", "boss", "friend"]);
export const roleSchema = z.enum(["student", "adult"]);
export const genreSchema = z.enum(["normal", "corporate", "nature_documentary", "action_movie"]);
export const loreTypeSchema = z.enum(["character", "event", "organization", "location", "object"]);

export type Audience = z.infer<typeof audienceSchema>;
export type UserRole = z.infer<typeof roleSchema>;
export type Genre = z.infer<typeof genreSchema>;
export type LoreType = z.infer<typeof loreTypeSchema>;

export const loreObjectSchema = z.object({
  id: z.string(),
  type: loreTypeSchema,
  name: z.string(),
  role: z.string(),
  description: z.string(),
  importance: z.number().min(0).max(1),
});

export const metricsSchema = z.object({
  believability: z.number().int().min(0).max(100),
  unhingedness: z.number().int().min(0).max(100),
  suspicion: z.number().int().min(0).max(100),
  loreDensity: z.number().int().min(0).max(100),
  commitment: z.number().int().min(0).max(100),
});

export const transcriptItemSchema = z.object({
  id: z.string(),
  speaker: z.enum(["interrogator", "user"]),
  text: z.string(),
});

export const interrogationSchema = z.object({
  active: z.boolean(),
  role: audienceSchema,
  difficulty: z.enum(["easy", "medium", "hard"]),
  currentQuestion: z.string(),
  questionNumber: z.number().int().min(0).max(5),
  transcript: z.array(transcriptItemSchema),
});

export const excuseStateSchema = z.object({
  id: z.string(),
  caseNumber: z.number().int().positive(),
  version: z.number().int().positive(),
  scenario: z.object({
    text: z.string().min(1).max(500),
    audience: audienceSchema,
    userRole: roleSchema,
  }),
  genre: genreSchema,
  chaosLevel: z.number().int().min(0).max(10),
  universeLevel: z.number().int().min(0).max(10),
  currentExcuse: z.string(),
  metrics: metricsSchema,
  lore: z.array(loreObjectSchema),
  claims: z.array(z.string()),
  contradictions: z.array(z.string()),
  interrogation: interrogationSchema.optional(),
  recommendation: z.string(),
  finalJudgment: z.string().optional(),
  status: z.enum(["active", "saved", "resolved"]),
  source: z.enum(["live", "local", "fallback"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ExcuseState = z.infer<typeof excuseStateSchema>;
export type Metrics = z.infer<typeof metricsSchema>;
export type LoreObject = z.infer<typeof loreObjectSchema>;

export const createCaseSchema = z.object({
  scenario: z.string().trim().min(8).max(500),
  audience: audienceSchema,
  userRole: roleSchema,
  genre: genreSchema,
  startingChaos: z.number().int().min(0).max(3),
});

export const caseActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("make_worse") }),
  z.object({ type: z.literal("add_lore") }),
  z.object({ type: z.literal("add_detail") }),
  z.object({ type: z.literal("escalate_universe") }),
  z.object({ type: z.literal("begin_interrogation") }),
  z.object({ type: z.literal("answer_interrogation"), answer: z.string().trim().min(2).max(1000) }),
  z.object({ type: z.literal("save_case") }),
  z.object({ type: z.literal("retreat") }),
]);

export const actionRequestSchema = z.object({
  action: caseActionSchema,
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});

export type CaseAction = z.infer<typeof caseActionSchema>;

export interface CaseSummary {
  id: string;
  caseNumber: number;
  title: string;
  status: ExcuseState["status"];
  chaosLevel: number;
  updatedAt: string;
}

export interface ActionResult {
  state: ExcuseState;
  source: "live" | "local" | "fallback";
  notice?: string;
}
