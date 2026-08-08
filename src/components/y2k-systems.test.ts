import { describe, expect, it } from "vitest";
import { arcadeLayout } from "@/components/PaperworkPanic";
import { audioCueForChaos } from "@/components/useAudioDirector";

describe("Y2K interaction systems", () => {
  it("keeps seeded arcade layouts stable and playable", () => {
    const first = arcadeLayout(4047919);
    expect(arcadeLayout(4047919)).toEqual(first);
    expect(first.forms).toHaveLength(5);
    expect(new Set(first.forms.map((item) => `${item.x}:${item.y}`)).size).toBe(5);
    expect(first.forms.every((item) => item.x >= 2 && item.x <= 7 && item.y >= 0 && item.y <= 4)).toBe(true);
  });

  it("escalates sound captions and synthesis by chaos band", () => {
    expect(audioCueForChaos(1).caption).toBe("GLASSY CLICK ACQUIRED");
    expect(audioCueForChaos(4).caption).toBe("MODEM NEGOTIATIONS INTENSIFY");
    expect(audioCueForChaos(7).caption).toBe("PIGEON COMMS ONLINE");
    expect(audioCueForChaos(9).caption).toBe("OFFICE CHAOS BEEP MIX");
  });
});
