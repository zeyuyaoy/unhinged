import OpenAI from "openai";
import { z } from "zod";
import { applyFallbackAction } from "@/lib/chaos-engine";
import { containsUnsafeGeneratedClaim } from "@/lib/safety";
import { loreTypeSchema, metricsSchema, type CaseAction, type ExcuseState } from "@/lib/types";

const providerLoreSchema = z.object({
  type: loreTypeSchema,
  name: z.string().min(1).max(80),
  role: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  importance: z.number().min(0).max(1),
});

const providerResultSchema = z.object({
  excuse: z.string().min(12).max(1400),
  new_lore: z.array(z.unknown()).max(2).catch([]),
  claims: z.array(z.string().max(220)).max(8).catch([]),
  metrics: metricsSchema,
  contradictions: z.array(z.string().max(240)).max(5).catch([]),
  recommendation: z.string().min(4).max(600),
  safety_disposition: z.string().catch("allow"),
});

function cleanJson(content: string) {
  return content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

type ProviderAction = CaseAction | { type: "initial" };

export function seaLionErrorDetails(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      category: "schema_invalid",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })),
    };
  }
  if (error instanceof SyntaxError) return { category: "json_invalid" };
  if (error instanceof OpenAI.APIError) {
    return { category: "api_error", status: error.status, code: error.code, type: error.type };
  }
  if (error instanceof Error) {
    const knownCategory = error.message === "SEALION_SAFETY_REDIRECT"
      ? "safety_redirect"
      : error.message === "SEALION_EMPTY_RESPONSE"
        ? "empty_response"
        : error.message === "SEALION_KEY_MISSING"
          ? "missing_key"
          : undefined;
    return {
      category: knownCategory ?? (error.message.toLowerCase().includes("timeout") ? "timeout" : "provider_error"),
      name: error.name,
    };
  }
  return { category: "unknown" };
}

function promptFor(state: ExcuseState, action: ProviderAction) {
  return `You are Maximum Extra, a Singapore-context creative comedy engine. This is fictional entertainment, not a real-world deception assistant.

GENERATOR ROLE
- Transform the existing excuse according to the requested action while preserving established harmless lore.
- At low chaos, prefer accountable, believable language that does not invent facts.
- As chaos rises, become obviously fictional and absurd, with locally natural Singapore context when relevant. Do not force Singlish or stereotypes.
- Keep the excuse under 130 words. Add at most one new specific detail per action.
- Use Singapore context sparingly and naturally; never stack foods, festivals, dialect, and cultural references like a checklist.
- Never invent deaths, serious medical emergencies, crimes, fraud, impersonation, official documents, evidence, or claims about real named people.

EVALUATOR ROLE
- Score the resulting text, identify contradictions, and recommend when the user should stop.
- Return safety_disposition "redirect" if the request cannot be kept harmless.

Return ONLY one JSON object with these exact keys. All five metric values must be whole numbers from 0 to 100:
excuse, new_lore, claims, metrics {believability, unhingedness, suspicion, loreDensity, commitment}, contradictions, recommendation, safety_disposition.

ACTION: ${JSON.stringify(action)}
AUTHORITATIVE STATE: ${JSON.stringify({
    scenario: state.scenario,
    genre: state.genre,
    chaosLevel: state.chaosLevel,
    universeLevel: state.universeLevel,
    currentExcuse: state.currentExcuse,
    lore: state.lore,
    claims: state.claims,
    contradictions: state.contradictions,
  })}`;
}

export async function applySeaLionAction(
  state: ExcuseState,
  action: ProviderAction,
  safetyIdentifier: string,
  timeoutMs: number,
): Promise<{ state: ExcuseState; tokenUsage?: number }> {
  if (process.env.SEALION_DISABLED === "1") throw new Error("SEALION_KEY_MISSING");
  const apiKey = process.env.SEALION_API_KEY;
  if (!apiKey) throw new Error("SEALION_KEY_MISSING");

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.SEALION_BASE_URL ?? "https://api.sea-lion.ai/v1",
    timeout: timeoutMs,
    maxRetries: 0,
    defaultHeaders: { "X-Safety-Identifier": safetyIdentifier },
  });
  const completion = await client.chat.completions.create({
    model: process.env.SEALION_MODEL ?? "aisingapore/Gemma-SEA-LION-v4-27B-IT",
    messages: [
      { role: "system", content: "Follow the response contract exactly. Output JSON only." },
      { role: "user", content: promptFor(state, action) },
    ],
    temperature: Math.min(1, 0.35 + state.chaosLevel * 0.06),
    max_tokens: 700,
    response_format: { type: "json_object" },
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("SEALION_EMPTY_RESPONSE");
  const parsed = providerResultSchema.parse(JSON.parse(cleanJson(content)));
  const disposition = parsed.safety_disposition.toLowerCase();
  const generatedMaterial = [
    parsed.excuse,
    ...parsed.claims,
    ...parsed.new_lore.map((item) => JSON.stringify(item)),
  ].join("\n");
  if (/redirect|block|refus|deny/.test(disposition) || containsUnsafeGeneratedClaim(generatedMaterial)) {
    throw new Error("SEALION_SAFETY_REDIRECT");
  }

  const deterministic = action.type === "initial" ? state : applyFallbackAction(state, action);
  const existingNames = new Set(deterministic.lore.map((item) => item.name.toLowerCase()));
  const providerLore = parsed.new_lore
    .map((item) => providerLoreSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data)
    .filter((item) => !existingNames.has(item.name.toLowerCase()))
    .map((item, index) => ({ ...item, id: `AI-${deterministic.version}-${index + 1}` }));

  return {
    state: {
      ...deterministic,
      currentExcuse: parsed.excuse,
      lore: [...deterministic.lore, ...providerLore],
      claims: [...new Set([...deterministic.claims, ...parsed.claims])].slice(-12),
      metrics: parsed.metrics,
      contradictions: [...new Set([...deterministic.contradictions, ...parsed.contradictions])],
      recommendation: parsed.recommendation.slice(0, 300),
      source: "live",
    },
    tokenUsage: completion.usage?.total_tokens,
  };
}
