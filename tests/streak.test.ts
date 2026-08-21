import { describe, expect, it } from "vitest";
import {
  EMPTY_STREAK,
  advanceStreak,
  displayedStreak,
  parseStreak,
  serializeStreak,
  type StreakState,
} from "@/lib/streak";

const state = (
  current: number,
  best: number,
  lastPlayedDate: string | null,
): StreakState => ({ current, best, lastPlayedDate });

describe("advanceStreak", () => {
  it("starts a run on the first ever play", () => {
    expect(advanceStreak(EMPTY_STREAK, "2026-07-01")).toEqual(
      state(1, 1, "2026-07-01"),
    );
  });

  it("extends a run played yesterday", () => {
    expect(advanceStreak(state(3, 5, "2026-06-30"), "2026-07-01")).toEqual(
      state(4, 5, "2026-07-01"),
    );
  });

  it("raises the best when the run passes it", () => {
    expect(advanceStreak(state(5, 5, "2026-06-30"), "2026-07-01")).toEqual(
      state(6, 6, "2026-07-01"),
    );
  });

  it("is idempotent for a second game on the same day", () => {
    // The summary screen records on the transition into it. Without this, two
    // games in one evening would read as two days.
    const once = advanceStreak(state(3, 5, "2026-07-01"), "2026-07-01");
    const twice = advanceStreak(once, "2026-07-01");
    expect(once).toEqual(state(3, 5, "2026-07-01"));
    expect(twice).toEqual(once);
  });

  it("restarts at 1 after a missed day", () => {
    expect(advanceStreak(state(9, 9, "2026-06-28"), "2026-07-01")).toEqual(
      state(1, 9, "2026-07-01"),
    );
  });

  it("leaves the run alone when the stored date is in the future", () => {
    // A clock change or a flight east. Punishing the player for that would be
    // the app's fault presented as theirs.
    expect(advanceStreak(state(4, 6, "2026-07-05"), "2026-07-01")).toEqual(
      state(4, 6, "2026-07-05"),
    );
  });

  it("restarts rather than throwing on an unreadable stored date", () => {
    expect(advanceStreak(state(4, 6, "garbage"), "2026-07-01")).toEqual(
      state(1, 6, "2026-07-01"),
    );
  });

  it("never records a current above best", () => {
    let current = EMPTY_STREAK;
    for (let day = 1; day <= 20; day += 1) {
      current = advanceStreak(
        current,
        `2026-07-${String(day).padStart(2, "0")}`,
      );
      expect(current.best).toBeGreaterThanOrEqual(current.current);
    }
    expect(current).toEqual(state(20, 20, "2026-07-20"));
  });
});

describe("displayedStreak", () => {
  it("keeps a run alive on the day it was played", () => {
    expect(
      displayedStreak(state(4, 6, "2026-07-01"), "2026-07-01").current,
    ).toBe(4);
  });

  it("keeps a run alive the day after, since today is not over", () => {
    expect(
      displayedStreak(state(4, 6, "2026-06-30"), "2026-07-01").current,
    ).toBe(4);
  });

  it("shows a broken run as zero without needing a write to fix it", () => {
    const shown = displayedStreak(state(4, 6, "2026-06-20"), "2026-07-01");
    expect(shown.current).toBe(0);
    // The best survives: it is a record, not a live run.
    expect(shown.best).toBe(6);
  });

  it("leaves a never-played streak alone", () => {
    expect(displayedStreak(EMPTY_STREAK, "2026-07-01")).toEqual(EMPTY_STREAK);
  });

  it("zeroes a run whose stored date cannot be read", () => {
    expect(displayedStreak(state(4, 6, "garbage"), "2026-07-01").current).toBe(
      0,
    );
  });
});

describe("parseStreak", () => {
  it("round-trips through serializeStreak", () => {
    const original = state(3, 7, "2026-07-01");
    expect(parseStreak(serializeStreak(original))).toEqual(original);
  });

  it("treats anything unexpected as no streak", () => {
    for (const raw of [
      null,
      "",
      "not json",
      "[]",
      "null",
      '{"current":3}', // no version
      '{"version":999,"current":3,"best":3,"lastPlayedDate":"2026-07-01"}',
    ]) {
      expect(parseStreak(raw)).toEqual(EMPTY_STREAK);
    }
  });

  it("discards nonsense fields rather than trusting them", () => {
    const parsed = parseStreak(
      JSON.stringify({
        version: 1,
        current: -5,
        best: "lots",
        lastPlayedDate: 42,
      }),
    );
    expect(parsed).toEqual(EMPTY_STREAK);
  });
});
