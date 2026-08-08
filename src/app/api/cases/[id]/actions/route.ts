import { NextResponse } from "next/server";
import { applyFallbackAction } from "@/lib/chaos-engine";
import { applySeaLionAction, seaLionErrorDetails } from "@/lib/sea-lion";
import { assessScenario } from "@/lib/safety";
import { getDeviceIdentity } from "@/lib/session";
import { commitCase, getCase, NotFoundError, VersionConflictError } from "@/lib/store";
import { actionRequestSchema } from "@/lib/types";

function providerErrorCategory(error: unknown) {
  const details = seaLionErrorDetails(error);
  if (details.category !== "provider_error") return details.category;
  if (!(error instanceof Error)) return "unknown";
  if (error.message.includes("MISSING")) return "missing_key";
  if (error.message.includes("SAFETY")) return "safety_redirect";
  if (error.name === "ZodError" || error instanceof SyntaxError) return "schema_invalid";
  if (error.message.toLowerCase().includes("timeout")) return "timeout";
  return "provider_error";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const started = Date.now();
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = actionRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: "VALIDATION", issues: parsed.error.issues }, { status: 400 });
  const { ownerHash, safetyIdentifier } = await getDeviceIdentity();

  try {
    const current = await getCase(ownerHash, id);
    if (current.version !== parsed.data.expectedVersion) {
      return NextResponse.json({ code: "VERSION_CONFLICT", state: current }, { status: 409 });
    }
    if (parsed.data.action.type === "answer_interrogation") {
      const assessment = assessScenario(parsed.data.action.answer);
      if (!assessment.allowed) {
        return NextResponse.json({ code: "POLICY_REDIRECT", message: assessment.message }, { status: 422 });
      }
    }

    const providerActions = new Set(["make_worse", "add_lore", "add_detail", "escalate_universe"]);
    const useProvider = providerActions.has(parsed.data.action.type);
    let source: "live" | "local" | "fallback" = useProvider ? "fallback" : "local";
    let next = applyFallbackAction(current, parsed.data.action, source === "local" ? "local" : "fallback");
    let tokenUsage: number | undefined;
    let errorCategory: string | undefined;
    if (useProvider) {
      try {
        const timeout = Number(process.env.SEALION_TRANSFORM_TIMEOUT_MS ?? 15_000);
        const live = await applySeaLionAction(current, parsed.data.action, safetyIdentifier, timeout);
        next = live.state;
        tokenUsage = live.tokenUsage;
        source = "live";
      } catch (error) {
        errorCategory = providerErrorCategory(error);
        if (errorCategory !== "missing_key") {
          console.warn("sea_lion_action_fallback", {
            caseId: id,
            action: parsed.data.action.type,
            ...seaLionErrorDetails(error),
          });
        }
      }
    }

    const state = await commitCase({
      ownerHash,
      state: next,
      expectedVersion: parsed.data.expectedVersion,
      idempotencyKey: parsed.data.idempotencyKey,
      action: parsed.data.action.type,
      source,
      latencyMs: Date.now() - started,
      tokenUsage,
      errorCategory,
    });
    return NextResponse.json({
      state,
      source,
      notice: source === "fallback"
        ? "SEA-LION was unavailable, so the entertaining demo continuation was used."
        : source === "local"
          ? "Timeline checked by the deterministic contradiction engine."
          : "Generated with SEA-LION.",
    });
  } catch (error) {
    if (error instanceof VersionConflictError) return NextResponse.json({ code: "VERSION_CONFLICT" }, { status: 409 });
    if (error instanceof NotFoundError) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
    console.error("case_action_failed", { caseId: id, category: providerErrorCategory(error) });
    return NextResponse.json({ code: "ACTION_FAILED" }, { status: 500 });
  }
}
