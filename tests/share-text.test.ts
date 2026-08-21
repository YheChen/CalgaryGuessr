import { describe, expect, it } from "vitest";
import { buildShareText, tileFor } from "@/lib/share-text";

describe("tileFor", () => {
  it("uses the same four bands as the results card verdict", () => {
    // If these drift, the grid a player shares disagrees with the verdict they
    // just read. The boundaries are the contract.
    expect(tileFor(5000)).toBe("🟩");
    expect(tileFor(4000)).toBe("🟩");
    expect(tileFor(3999)).toBe("🟦");
    expect(tileFor(2500)).toBe("🟦");
    expect(tileFor(2499)).toBe("🟨");
    expect(tileFor(1000)).toBe("🟨");
    expect(tileFor(999)).toBe("⬛");
    expect(tileFor(0)).toBe("⬛");
  });
});

describe("buildShareText", () => {
  const base = {
    totalScore: 12345,
    maxScore: 25000,
    scores: [
      { score: 4200 },
      { score: 3000 },
      { score: 1500 },
      { score: 800 },
      { score: 0 },
    ],
    mode: "classic" as const,
    challengeDate: null,
  };

  it("puts the title, the score, the grid and a link on four lines", () => {
    const lines = buildShareText(base).split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe("CalgaryGuessr");
    expect(lines[1]).toBe("12,345 / 25,000");
    expect(lines[2]).toBe("🟩🟦🟨⬛⬛");
    expect(lines[3]).toMatch(/^https?:\/\//);
  });

  it("names the day for a daily game", () => {
    const text = buildShareText({
      ...base,
      mode: "daily",
      challengeDate: "2026-07-01",
    });
    expect(text.split("\n")[0]).toBe("CalgaryGuessr Daily 2026-07-01");
  });

  it("falls back to the plain title when a daily has no date", () => {
    const text = buildShareText({ ...base, mode: "daily", challengeDate: null });
    expect(text.split("\n")[0]).toBe("CalgaryGuessr");
  });

  it("never leaks where the answers were", () => {
    // A shared result gets posted publicly, possibly before friends have
    // played the same daily. Coordinates in it would spoil the round.
    const text = buildShareText({
      ...base,
      mode: "daily",
      challengeDate: "2026-07-01",
    });
    expect(text).not.toMatch(/51\.\d/);
    expect(text).not.toMatch(/-114\.\d/);
  });

  it("emits one tile per round played", () => {
    const short = buildShareText({ ...base, scores: [{ score: 4200 }] });
    expect(short.split("\n")[2]).toBe("🟩");
  });

  it("handles a game with no rounds without producing a broken grid", () => {
    const empty = buildShareText({ ...base, scores: [], totalScore: 0 });
    expect(empty.split("\n")[2]).toBe("");
  });
});
