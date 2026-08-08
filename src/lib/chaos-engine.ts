import type { CaseAction, ExcuseState, LoreObject, Metrics } from "@/lib/types";

export const CHAOS_LABELS = [
  "Completely normal",
  "Mildly unusual",
  "Suspicious",
  "Dramatic",
  "Extremely dramatic",
  "Unhinged",
  "Reality bending",
  "International incident",
  "Physics optional",
  "Maximum Extra",
  "Tell the truth",
] as const;

export const UNIVERSE_LABELS = [
  "Personal",
  "Family",
  "Neighborhood",
  "City",
  "National",
  "International",
  "Geopolitical",
  "Existential",
  "Interdimensional",
  "Reality-wide",
  "Post-reality",
] as const;

export function clamp(value: number, min = 0, max = 10) {
  return Math.max(min, Math.min(max, value));
}

export function chaosBand(level: number): "calm" | "warming" | "warning" | "critical" {
  if (level <= 2) return "calm";
  if (level <= 5) return "warming";
  if (level <= 7) return "warning";
  return "critical";
}

function metric(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function metricsForLevel(level: number, loreCount: number, interrogationAnswers = 0): Metrics {
  return {
    believability: metric(92 - level * 9.6 - interrogationAnswers * 2),
    unhingedness: metric(4 + level * 10.4),
    suspicion: metric(9 + level * 9.5 + interrogationAnswers * 5),
    loreDensity: metric(loreCount * 21 + level * 2),
    commitment: metric(38 + level * 7.2),
  };
}

function lore(id: string, type: LoreObject["type"], name: string, role: string, description: string, importance: number): LoreObject {
  return { id, type, name, role, description, importance };
}

function ensureLore(state: ExcuseState, action: CaseAction): LoreObject[] {
  const next = [...state.lore];
  const add = (item: LoreObject) => {
    if (!next.some((existing) => existing.name === item.name)) next.push(item);
  };
  if (action.type === "add_lore" || state.chaosLevel >= 4) {
    add(lore("CHAR-001", "character", "Raymond", "Alleged uncle", "Always appears when the timeline is least prepared.", 0.8));
  }
  if ((action.type === "add_lore" && next.length > 0) || state.chaosLevel >= 5) {
    add(lore("EVENT-001", "event", "Aquarium Incident", "Event", "A transport delay that somehow acquired marine jurisdiction.", 0.9));
  }
  if (state.chaosLevel >= 7) {
    add(lore("ORG-001", "organization", "Transit Authority", "Organization", "Officially declines to define the bus as a vehicle.", 0.7));
  }
  if (state.chaosLevel >= 8) {
    add(lore("OBJ-001", "object", "Maritime Clause", "Object", "A clause Raymond insists applies on dry land.", 0.65));
  }
  return next;
}

const escalationCopy = [
  "I’m sorry I missed the deadline. An unexpected MRT delay disrupted my schedule, and I should have contacted you sooner.",
  "I’m sorry I missed the deadline. An MRT delay disrupted my schedule, and I made the poor decision to assume I could still make up the time.",
  "I missed the deadline after an MRT delay turned into a surprisingly complicated transport problem. I should still have messaged you earlier.",
  "I couldn’t submit the assignment because a routine transport delay became an aquarium-related incident, and Raymond had the only copy of the file.",
  "The assignment was ready until Raymond redirected the only copy during an aquarium-related transport incident that now involves the neighborhood committee.",
  "The assignment is temporarily held up because Raymond, the aquarium incident, and the transit authority all disagree about who technically has custody of the file.",
  "The transit authority has opened a case into Raymond’s handling of the assignment during the aquarium incident. The bus is currently evidence.",
  "The assignment is under temporary international aquarium jurisdiction, Raymond has invoked a maritime clause, and the bus is no longer considered a vehicle.",
  "At this point, the assignment exists in three jurisdictions, Raymond is recognised by none of them, and the laws of public transport have become advisory.",
  "At this point, the assignment is under temporary international aquarium jurisdiction, Raymond has invoked a previously undisclosed maritime clause, and the bus is no longer considered a vehicle.",
  "Just submit the assignment. Reality has filed a formal objection.",
] as const;

const questions = [
  "Why didn’t you contact me before the deadline?",
  "Who exactly is Raymond?",
  "Okay. Then why did you mention Raymond if he was supposedly at the aquarium?",
  "Why does the transit authority have any involvement in your assignment?",
  "One final question: do you honestly expect me to believe this?",
] as const;

function detectContradictions(answer: string, state: ExcuseState): string[] {
  const contradictions = [...state.contradictions];
  if (/raymond.*(teacher|boss)/i.test(answer) && state.lore.some((item) => item.name === "Raymond")) {
    contradictions.push("Raymond was previously established as your alleged uncle.");
  }
  if (/never.*aquarium|no aquarium/i.test(answer) && state.lore.some((item) => item.name === "Aquarium Incident")) {
    contradictions.push("The Aquarium Incident is already part of the case file.");
  }
  return [...new Set(contradictions)];
}

export function createFallbackState(input: {
  id: string;
  caseNumber: number;
  scenario: string;
  audience: ExcuseState["scenario"]["audience"];
  userRole: ExcuseState["scenario"]["userRole"];
  genre: ExcuseState["genre"];
  startingChaos: number;
}): ExcuseState {
  const now = new Date().toISOString();
  const level = clamp(input.startingChaos);
  return {
    id: input.id,
    caseNumber: input.caseNumber,
    version: 1,
    scenario: { text: input.scenario, audience: input.audience, userRole: input.userRole },
    genre: input.genre,
    chaosLevel: level,
    universeLevel: 0,
    currentExcuse: escalationCopy[level],
    metrics: metricsForLevel(level, 0),
    lore: [],
    claims: ["A transport delay affected the schedule."],
    contradictions: [],
    recommendation: "This is believable enough. You could stop here.",
    status: "active",
    source: "fallback",
    createdAt: now,
    updatedAt: now,
  };
}

export function applyFallbackAction(state: ExcuseState, action: CaseAction, source: "local" | "fallback" = "fallback"): ExcuseState {
  const now = new Date().toISOString();
  let chaos = state.chaosLevel;
  let universe = state.universeLevel;
  let interrogation = state.interrogation;
  let status = state.status;
  let finalJudgment = state.finalJudgment;
  let contradictions = [...state.contradictions];

  if (action.type === "make_worse") chaos = clamp(chaos + 2);
  if (action.type === "add_lore" || action.type === "add_detail") chaos = clamp(chaos + 1);
  if (action.type === "escalate_universe") {
    chaos = clamp(chaos + 2);
    universe = clamp(universe + 2);
  }
  if (action.type === "begin_interrogation") {
    chaos = Math.max(5, chaos);
    interrogation = {
      active: true,
      role: state.scenario.audience,
      difficulty: "hard",
      currentQuestion: questions[0],
      questionNumber: 1,
      transcript: [{ id: crypto.randomUUID(), speaker: "interrogator", text: questions[0] }],
    };
  }
  if (action.type === "answer_interrogation" && interrogation) {
    const nextNumber = Math.min(5, interrogation.questionNumber + 1);
    contradictions = detectContradictions(action.answer, state);
    const transcript = [
      ...interrogation.transcript,
      { id: crypto.randomUUID(), speaker: "user" as const, text: action.answer },
    ];
    if (interrogation.questionNumber >= 5) {
      status = "resolved";
      finalJudgment = "JUST SUBMIT THE ASSIGNMENT.";
      interrogation = { ...interrogation, active: false, transcript };
      chaos = Math.max(9, chaos);
    } else {
      const nextQuestion = questions[nextNumber - 1];
      interrogation = {
        ...interrogation,
        questionNumber: nextNumber,
        currentQuestion: nextQuestion,
        transcript: [...transcript, { id: crypto.randomUUID(), speaker: "interrogator", text: nextQuestion }],
      };
      chaos = clamp(chaos + 1);
    }
  }
  if (action.type === "retreat") {
    status = "resolved";
    finalJudgment = "HONESTY ACHIEVEMENT UNLOCKED. JUST TELL THE TRUTH.";
    interrogation = interrogation ? { ...interrogation, active: false } : undefined;
  }
  if (action.type === "save_case") status = "saved";

  const nextBase = { ...state, chaosLevel: chaos };
  const nextLore = ensureLore(nextBase, action);
  const answered = interrogation?.transcript.filter((item) => item.speaker === "user").length ?? 0;
  if (chaos >= 9 && !finalJudgment) finalJudgment = "JUST SUBMIT THE ASSIGNMENT.";
  const recommendation = finalJudgment
    ? "Just submit the assignment."
    : chaos >= 7
      ? "Stop adding details while you still can."
      : chaos >= 4
        ? "This would be an excellent time to stop talking."
        : "This is believable enough. You could stop here.";

  return {
    ...state,
    version: state.version + 1,
    chaosLevel: chaos,
    universeLevel: universe,
    currentExcuse: escalationCopy[chaos],
    lore: nextLore,
    metrics: metricsForLevel(chaos, nextLore.length, answered),
    contradictions,
    interrogation,
    recommendation,
    finalJudgment,
    status,
    source,
    updatedAt: now,
  };
}
