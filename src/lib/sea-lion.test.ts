import { describe, expect, it } from "vitest";
import { createFallbackState } from "@/lib/chaos-engine";
import { prepareProviderState, promptFor } from "@/lib/sea-lion";

describe("SEA-LION prompt context", () => {
  it("sends the canonical recurring lore instead of the legacy identity", () => {
    const seed = createFallbackState({
      id: "278f9a3c-e7f7-4ed7-adb2-40c11275bba5",
      caseNumber: 1,
      scenario: "I need an excuse for missing my assignment.",
      audience: "teacher",
      userRole: "student",
      genre: "normal",
      startingChaos: 1,
    });
    const action = { type: "add_lore" } as const;
    const state = prepareProviderState(seed, action);
    const prompt = promptFor(state, action);
    expect(prompt).toContain("Emergency Backup Pigeon");
    expect(prompt).toContain("Unlicensed logistics consultant");
    expect(prompt).not.toContain("Raymond");
  });
});
