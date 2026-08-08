import type { ArcadeState, CaseAction, ExcuseState, LoreObject, Metrics } from "@/lib/types";

export const PRIMARY_LORE_ID = "CHAR-001";
export const PRIMARY_LORE: LoreObject = {
  id: PRIMARY_LORE_ID,
  type: "character",
  name: "Emergency Backup Pigeon",
  role: "Unlicensed logistics consultant",
  description: "An aquarium-dispatched pigeon that appears whenever the timeline misplaces its paperwork.",
  importance: 0.8,
};

const LEGACY_PRIMARY_LORE_NAME = "Raymond";

export const EMPTY_ARCADE_STATE: ArcadeState = {
  roundsPlayed: 0,
  deliveries: 0,
  misfiles: 0,
  skips: 0,
  bestScore: 0,
  collectibles: [],
};

const ARCADE_COLLECTIBLES = [
  "Form 404: Deadline Not Found",
  "Aquarium Transit Visa",
  "Certified Breadcrumb Voucher",
  "Non-Vehicular Bus Permit",
  "Maritime Clause Decoder Ring",
  "Reality Recount Receipt",
] as const;

export class ArcadeRoundConflictError extends Error {}

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
  "Maximum Extrcuse",
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

export function arcadeMetricModifiers(arcade: ArcadeState = EMPTY_ARCADE_STATE) {
  return {
    suspicion: clamp(arcade.misfiles * 4 - arcade.deliveries * 3, -9, 12),
    commitment: clamp(arcade.deliveries * 3, 0, 9),
  };
}

export function metricsForLevel(level: number, loreCount: number, interrogationAnswers = 0, arcade: ArcadeState = EMPTY_ARCADE_STATE): Metrics {
  const modifiers = arcadeMetricModifiers(arcade);
  return {
    believability: metric(92 - level * 9.6 - interrogationAnswers * 2),
    unhingedness: metric(4 + level * 10.4),
    suspicion: metric(9 + level * 9.5 + interrogationAnswers * 5 + modifiers.suspicion),
    loreDensity: metric(loreCount * 21 + level * 2),
    commitment: metric(38 + level * 7.2 + modifiers.commitment),
  };
}

function seededNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shouldScheduleArcade(action: CaseAction) {
  return ["make_worse", "add_lore", "add_detail", "escalate_universe", "begin_interrogation", "answer_interrogation"].includes(action.type);
}

export function scheduleArcadeRound(state: ExcuseState, action: CaseAction): ExcuseState {
  const arcade = state.arcade ?? EMPTY_ARCADE_STATE;
  if (state.chaosLevel < 8 || arcade.pendingRound || !shouldScheduleArcade(action)) return { ...state, arcade };
  const id = `${state.id}:${state.version}:paperwork-panic`;
  const seedInput = `${state.scenario.text}:${state.version}:${arcade.roundsPlayed}`;
  return {
    ...state,
    arcade: {
      ...arcade,
      pendingRound: { id, seed: seededNumber(seedInput), durationMs: 8000, targetCount: 3 },
    },
  };
}

function lore(id: string, type: LoreObject["type"], name: string, role: string, description: string, importance: number): LoreObject {
  return { id, type, name, role, description, importance };
}

export function getPrimaryLore(state: Pick<ExcuseState, "lore">) {
  return state.lore.find((item) => item.id === PRIMARY_LORE_ID);
}

function ensureLore(state: ExcuseState, action: CaseAction): LoreObject[] {
  const next = [...state.lore];
  const add = (item: LoreObject) => {
    if (!next.some((existing) => existing.id === item.id || existing.name === item.name)) next.push(item);
  };
  if (action.type === "add_lore" || state.chaosLevel >= 4) {
    add(PRIMARY_LORE);
  }
  if ((action.type === "add_lore" && next.length > 0) || state.chaosLevel >= 5) {
    add(lore("EVENT-001", "event", "Aquarium Incident", "Event", "A transport delay that somehow acquired marine jurisdiction.", 0.9));
  }
  if (state.chaosLevel >= 7) {
    add(lore("ORG-001", "organization", "Transit Authority", "Organization", "Officially declines to define the bus as a vehicle.", 0.7));
  }
  if (state.chaosLevel >= 8) {
    add(lore("OBJ-001", "object", "Maritime Clause", "Object", "An imaginary rule the Emergency Backup Pigeon insists applies on dry land.", 0.65));
  }
  return next;
}

const escalationCopy = [
  "I’m sorry I missed the deadline. An unexpected MRT delay disrupted my schedule, and I should have contacted you sooner.",
  "I’m sorry I missed the deadline. An MRT delay disrupted my schedule, and I made the poor decision to assume I could still make up the time.",
  "I missed the deadline after an MRT delay turned into a surprisingly complicated transport problem. I should still have messaged you earlier.",
  "I couldn’t submit the assignment because a routine transport delay became an aquarium incident, and an Emergency Backup Pigeon flew off with the only copy.",
  "The assignment was ready until the Emergency Backup Pigeon rerouted it through the aquarium and alerted the neighbourhood committee.",
  "The assignment is temporarily held up because the Emergency Backup Pigeon, the aquarium, and the transit authority disagree about who has custody of the file.",
  "The transit authority is reviewing the Emergency Backup Pigeon’s handling of the assignment. The bus is now classified as a witness.",
  "The assignment is under temporary international aquarium jurisdiction, the Emergency Backup Pigeon has invoked an imaginary maritime clause, and the bus is no longer considered a vehicle.",
  "The assignment now exists in three jurisdictions, the Emergency Backup Pigeon is accredited by none of them, and the laws of public transport have become advisory.",
  "The aquarium has appointed the Emergency Backup Pigeon as interim file custodian. Reality has requested a recount.",
  "Just submit the assignment. Reality has filed a formal objection.",
] as const;

const plansCopy = [
  "I’m sorry, but I need to cancel. My schedule shifted unexpectedly, and I should have told you sooner.",
  "I need to cancel tonight. An MRT delay threw off my timing, and I waited too long to admit the rest of the evening would not recover.",
  "I need to cancel. A transport delay turned into a complicated reroute, and I should have sent this message before it became a whole situation.",
  "I can’t make it because a routine transport delay became an aquarium incident, and an Emergency Backup Pigeon flew off with our booking details.",
  "Tonight’s plans were intact until the Emergency Backup Pigeon rerouted the booking through the aquarium and involved the neighbourhood committee.",
  "The plans are on hold because the Emergency Backup Pigeon, the aquarium, and the transit authority disagree about where dinner is allowed to occur.",
  "The transit authority is reviewing the Emergency Backup Pigeon’s handling of the booking. Our table is now classified as a platform.",
  "Dinner is under temporary international aquarium jurisdiction, and the Emergency Backup Pigeon has invoked an imaginary maritime clause over the reservation.",
  "The reservation exists in three jurisdictions, the Emergency Backup Pigeon is accredited by none of them, and dinner may violate aquarium custom.",
  "The restaurant has declared itself neutral territory while the Emergency Backup Pigeon circles the aquarium with our reservation.",
  "Send an honest message. The fish have been through enough.",
] as const;

const lateCopy = [
  "I’m running late. I underestimated the journey and should have sent you a realistic arrival time earlier.",
  "I’m running late because of an MRT delay. I’m on the way now, and I should have updated you sooner.",
  "I’m delayed after an MRT disruption became a longer reroute than expected. I’ll send a real ETA instead of guessing again.",
  "I’m late because a routine transport delay became an aquarium incident, and an Emergency Backup Pigeon redirected me to the wrong interchange.",
  "I was nearly there until the Emergency Backup Pigeon rerouted me through the aquarium and alerted the neighbourhood committee.",
  "My arrival is delayed because the Emergency Backup Pigeon, the aquarium, and the transit authority disagree about whether my bus is still a bus.",
  "The transit authority is reviewing the Emergency Backup Pigeon’s directions. My bus is now a witness, so my ETA has become an opinion.",
  "My route is under temporary aquarium jurisdiction, the Emergency Backup Pigeon has invoked an imaginary maritime clause, and the bus is no longer recognised as a vehicle.",
  "I am approaching from one of three jurisdictions. The Emergency Backup Pigeon controls none of them, and public transport is now merely a suggestion.",
  "My ETA has achieved diplomatic immunity. The Emergency Backup Pigeon requests one legally neutral interchange and several breadcrumbs.",
  "Apologise and send the real ETA. Reality is waiting.",
] as const;

function scenarioKind(text: string): "deadline" | "plans" | "late" {
  if (/cancel|plans|dinner|meet (up|you)|can['’]?t make/i.test(text)) return "plans";
  if (/late|running behind|arrival|meeting/i.test(text)) return "late";
  return "deadline";
}

function copyForScenario(text: string, level: number) {
  const kind = scenarioKind(text);
  return (kind === "plans" ? plansCopy : kind === "late" ? lateCopy : escalationCopy)[level];
}

function finalJudgmentForScenario(text: string) {
  const kind = scenarioKind(text);
  if (kind === "plans") return "SEND AN HONEST MESSAGE.";
  if (kind === "late") return "APOLOGISE. SEND THE REAL ETA.";
  return "JUST SUBMIT THE ASSIGNMENT.";
}

function finalRecommendationForScenario(text: string) {
  const kind = scenarioKind(text);
  if (kind === "plans") return "Send an honest message.";
  if (kind === "late") return "Apologise and send the real ETA.";
  return "Just submit the assignment.";
}

export function interrogationQuestions(state: Pick<ExcuseState, "scenario">) {
  const kind = scenarioKind(state.scenario.text);
  const first = kind === "plans"
    ? "Why didn’t you cancel before everyone arranged their evening?"
    : kind === "late"
      ? "Why didn’t you send a realistic ETA sooner?"
      : "Why didn’t you contact me before the deadline?";
  const subject = kind === "plans" ? "reservation" : kind === "late" ? "route" : "assignment";
  return [
    first,
    "Who authorised an Emergency Backup Pigeon?",
    `If the pigeon was dispatched by the aquarium, how did it end up controlling your ${subject}?`,
    `Why does the transit authority have any involvement in your ${subject}?`,
    "One final question: do you honestly expect me to believe this?",
  ] as const;
}

function detectContradictions(answer: string, state: ExcuseState): string[] {
  const contradictions = [...state.contradictions];
  const primaryLore = getPrimaryLore(state);
  const mentionsPrimaryLore = /emergency backup pigeon|backup pigeon|pigeon|raymond/i.test(answer);
  if (primaryLore && mentionsPrimaryLore && /(teacher|boss|uncle|parent|friend)/i.test(answer)) {
    contradictions.push(`${primaryLore.name} was previously established as your ${primaryLore.role.toLowerCase()}.`);
  }
  if (/never.*aquarium|no aquarium/i.test(answer) && state.lore.some((item) => item.name === "Aquarium Incident")) {
    contradictions.push("The Aquarium Incident is already part of the case file.");
  }
  return [...new Set(contradictions)];
}

function replaceLegacyPrimaryLoreName(value: string) {
  return value.replace(/Raymond(?:['’]s)?/gi, (match, offset: number, source: string) => {
    const atSentenceStart = offset === 0 || /[.!?]\s*$/.test(source.slice(0, offset));
    const name = `${atSentenceStart ? "The" : "the"} ${PRIMARY_LORE.name}`;
    return /['’]s$/i.test(match) ? `${name}’s` : name;
  });
}

export function normalizeLegacyLoreState(state: ExcuseState): ExcuseState {
  const normalizeText = (value: string) => replaceLegacyPrimaryLoreName(value);
  const loreItems = state.lore.map((item) => (
    item.id === PRIMARY_LORE_ID || item.name.toLowerCase() === LEGACY_PRIMARY_LORE_NAME.toLowerCase()
      ? PRIMARY_LORE
      : { ...item, description: normalizeText(item.description) }
  ));
  const deduplicatedLore = loreItems.filter((item, index) => loreItems.findIndex((candidate) => candidate.id === item.id) === index);
  const interrogation = state.interrogation
    ? {
        ...state.interrogation,
        currentQuestion: normalizeText(state.interrogation.currentQuestion),
        transcript: state.interrogation.transcript.map((item) => item.speaker === "user" ? item : { ...item, text: normalizeText(item.text) }),
      }
    : undefined;
  const arcade = state.arcade
    ? { ...EMPTY_ARCADE_STATE, ...state.arcade, collectibles: [...new Set(state.arcade.collectibles ?? [])].slice(0, 12) }
    : { ...EMPTY_ARCADE_STATE };
  return {
    ...state,
    currentExcuse: normalizeText(state.currentExcuse),
    lore: deduplicatedLore,
    claims: state.claims.map(normalizeText),
    contradictions: state.contradictions.map((item) => item === "Raymond was previously established as your alleged uncle."
      ? `${PRIMARY_LORE.name} was previously established as your ${PRIMARY_LORE.role.toLowerCase()}.`
      : normalizeText(item)),
    interrogation,
    arcade,
    recommendation: normalizeText(state.recommendation),
    finalJudgment: state.finalJudgment ? normalizeText(state.finalJudgment) : undefined,
  };
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
    currentExcuse: copyForScenario(input.scenario, level),
    metrics: metricsForLevel(level, 0),
    lore: [],
    claims: ["A transport delay affected the schedule."],
    contradictions: [],
    arcade: { ...EMPTY_ARCADE_STATE },
    recommendation: "This is believable enough. You could stop here.",
    status: "active",
    source: "fallback",
    createdAt: now,
    updatedAt: now,
  };
}

export function applyFallbackAction(state: ExcuseState, action: CaseAction, source: "local" | "fallback" = "fallback"): ExcuseState {
  const now = new Date().toISOString();
  const currentArcade = state.arcade ?? { ...EMPTY_ARCADE_STATE };

  if (action.type === "resolve_arcade_round") {
    const pending = currentArcade.pendingRound;
    if (!pending || pending.id !== action.roundId) throw new ArcadeRoundConflictError("ARCADE_ROUND_CONFLICT");
    const delivered = !action.skipped && action.collected >= pending.targetCount && action.hazardsHit < 3;
    const score = Math.max(0, action.collected * 100 - action.hazardsHit * 25);
    const collectible = ARCADE_COLLECTIBLES[currentArcade.deliveries % ARCADE_COLLECTIBLES.length];
    const arcade: ArcadeState = {
      ...currentArcade,
      pendingRound: undefined,
      roundsPlayed: currentArcade.roundsPlayed + 1,
      deliveries: currentArcade.deliveries + (delivered ? 1 : 0),
      misfiles: currentArcade.misfiles + (!action.skipped && !delivered ? 1 : 0),
      skips: currentArcade.skips + (action.skipped ? 1 : 0),
      bestScore: Math.max(currentArcade.bestScore, score),
      collectibles: delivered
        ? [...new Set([...currentArcade.collectibles, collectible])].slice(0, 12)
        : currentArcade.collectibles,
    };
    const contradictions = !action.skipped && !delivered
      ? [...new Set([...state.contradictions, "Paperwork Panic misfiled another form before it reached the aquarium portal."])]
      : state.contradictions;
    const answered = state.interrogation?.transcript.filter((item) => item.speaker === "user").length ?? 0;
    return {
      ...state,
      version: state.version + 1,
      metrics: metricsForLevel(state.chaosLevel, state.lore.length, answered, arcade),
      contradictions,
      arcade,
      source,
      updatedAt: now,
    };
  }

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
    const questions = interrogationQuestions(state);
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
    const questions = interrogationQuestions(state);
    const nextNumber = Math.min(5, interrogation.questionNumber + 1);
    contradictions = detectContradictions(action.answer, state);
    const transcript = [
      ...interrogation.transcript,
      { id: crypto.randomUUID(), speaker: "user" as const, text: action.answer },
    ];
    if (interrogation.questionNumber >= 5) {
      status = "resolved";
      finalJudgment = finalJudgmentForScenario(state.scenario.text);
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
  if (chaos >= 9 && !finalJudgment) finalJudgment = finalJudgmentForScenario(state.scenario.text);
  const recommendation = finalJudgment
    ? finalRecommendationForScenario(state.scenario.text)
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
    currentExcuse: copyForScenario(state.scenario.text, chaos),
    lore: nextLore,
    metrics: metricsForLevel(chaos, nextLore.length, answered, currentArcade),
    contradictions,
    interrogation,
    arcade: currentArcade,
    recommendation,
    finalJudgment,
    status,
    source,
    updatedAt: now,
  };
}
