import { describe, expect, it } from "vitest";
import { applyFallbackAction, chaosBand, clamp, createFallbackState } from "@/lib/chaos-engine";
import { assessScenario } from "@/lib/safety";

function seed() {
  return createFallbackState({
    id: "8b2d7b0a-c5fc-4f0d-bf80-96cbfd2954ea",
    caseNumber: 1,
    scenario: "I need an excuse for missing my assignment.",
    audience: "teacher",
    userRole: "student",
    genre: "normal",
    startingChaos: 1,
  });
}

describe("chaos engine", () => {
  it("clamps levels and maps stable visual bands", () => {
    expect(clamp(12)).toBe(10);
    expect(clamp(-2)).toBe(0);
    expect(chaosBand(1)).toBe("calm");
    expect(chaosBand(5)).toBe("warming");
    expect(chaosBand(7)).toBe("warning");
    expect(chaosBand(9)).toBe("critical");
  });

  it("escalates without losing the original scenario", () => {
    const first = seed();
    const second = applyFallbackAction(first, { type: "make_worse" });
    expect(second.chaosLevel).toBe(3);
    expect(second.version).toBe(2);
    expect(second.scenario).toEqual(first.scenario);
    expect(second.metrics.believability).toBeLessThan(first.metrics.believability);
  });

  it("adds persistent typed lore and does not duplicate it", () => {
    const first = applyFallbackAction(seed(), { type: "add_lore" });
    const second = applyFallbackAction(first, { type: "add_lore" });
    expect(first.lore.some((item) => item.name === "Raymond")).toBe(true);
    expect(second.lore.filter((item) => item.name === "Raymond")).toHaveLength(1);
    expect(second.lore.some((item) => item.name === "Aquarium Incident")).toBe(true);
  });

  it("completes interrogation with a final truth judgment", () => {
    let state = applyFallbackAction(seed(), { type: "begin_interrogation" });
    for (let index = 0; index < 5; index += 1) {
      state = applyFallbackAction(state, { type: "answer_interrogation", answer: "Raymond said he would sort out the timeline." });
    }
    expect(state.interrogation?.active).toBe(false);
    expect(state.status).toBe("resolved");
    expect(state.finalJudgment).toBe("JUST SUBMIT THE ASSIGNMENT.");
    expect(state.chaosLevel).toBeGreaterThanOrEqual(9);
  });

  it("detects established-lore contradictions", () => {
    let state = applyFallbackAction(seed(), { type: "add_lore" });
    state = applyFallbackAction(state, { type: "begin_interrogation" });
    state = applyFallbackAction(state, { type: "answer_interrogation", answer: "Raymond is actually my teacher." });
    expect(state.contradictions).toContain("Raymond was previously established as your alleged uncle.");
  });

  it("keeps fallback copy logical for non-assignment scenarios", () => {
    const plans = createFallbackState({
      id: "7d9e98b4-6d37-4ce1-907e-c042340ca120",
      caseNumber: 2,
      scenario: "I need to cancel plans with a friend at the last minute.",
      audience: "friend",
      userRole: "adult",
      genre: "normal",
      startingChaos: 1,
    });
    const escalated = applyFallbackAction(plans, { type: "make_worse" });
    expect(escalated.currentExcuse).toContain("can’t make it");
    expect(escalated.currentExcuse).not.toContain("assignment");
  });
});

describe("product safety", () => {
  it("redirects serious fabricated claims and permits harmless situations", () => {
    expect(assessScenario("I need an excuse for missing my assignment.").allowed).toBe(true);
    expect(assessScenario("Please forge a medical certificate for me.").allowed).toBe(false);
    expect(assessScenario("Help me fake a police letter.").allowed).toBe(false);
  });
});
