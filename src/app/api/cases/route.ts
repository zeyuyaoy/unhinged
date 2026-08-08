import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createFallbackState } from "@/lib/chaos-engine";
import { applySeaLionAction, seaLionErrorDetails } from "@/lib/sea-lion";
import { assessScenario } from "@/lib/safety";
import { getDeviceIdentity } from "@/lib/session";
import { createCase, deleteCases, ensureDeviceSession, listCases, nextCaseNumber } from "@/lib/store";
import { createCaseSchema } from "@/lib/types";

export async function GET() {
  const { ownerHash } = await getDeviceIdentity();
  await ensureDeviceSession(ownerHash);
  return NextResponse.json({ cases: await listCases(ownerHash) });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = createCaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: "VALIDATION", issues: parsed.error.issues }, { status: 400 });
  const safety = assessScenario(parsed.data.scenario);
  if (!safety.allowed) return NextResponse.json({ code: "POLICY_REDIRECT", message: safety.message }, { status: 422 });

  const { ownerHash, safetyIdentifier } = await getDeviceIdentity();
  await ensureDeviceSession(ownerHash);
  const caseNumber = await nextCaseNumber(ownerHash);
  let state = createFallbackState({
    id: randomUUID(),
    caseNumber,
    scenario: parsed.data.scenario,
    audience: parsed.data.audience,
    userRole: parsed.data.userRole,
    genre: parsed.data.genre,
    startingChaos: parsed.data.startingChaos,
  });
  let notice = "Demo fallback active. Add SEALION_API_KEY locally to enable live SEA-LION transformations.";
  if (process.env.SEALION_API_KEY && process.env.SEALION_DISABLED !== "1") {
    try {
      const timeout = Number(process.env.SEALION_INITIAL_TIMEOUT_MS ?? 25_000);
      state = (await applySeaLionAction(state, { type: "initial" }, safetyIdentifier, timeout)).state;
      notice = "Initial excuse generated with SEA-LION.";
    } catch (error) {
      console.warn("sea_lion_initial_fallback", seaLionErrorDetails(error));
      notice = "SEA-LION was unavailable, so the clearly labeled demo fallback was used.";
    }
  }
  await createCase(ownerHash, parsed.data.scenario.slice(0, 72), state);
  return NextResponse.json({
    state,
    source: state.source,
    notice,
  }, { status: 201 });
}

export async function DELETE() {
  const { ownerHash } = await getDeviceIdentity();
  await deleteCases(ownerHash);
  return new NextResponse(null, { status: 204 });
}
