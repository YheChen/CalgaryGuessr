import { describe, expect, it } from "vitest";
import {
  MAX_ROUND_SCORE,
  calculateDistance,
  calculateScore,
} from "@/lib/game-utils";

describe("calculateDistance", () => {
  it("is zero for a point against itself", () => {
    expect(calculateDistance(51.0447, -114.0719, 51.0447, -114.0719)).toBe(0);
  });

  it("matches a known Calgary pair", () => {
    // Calgary Tower to the Peace Bridge, about 1.4 km apart.
    const km = calculateDistance(51.0447, -114.0631, 51.0533, -114.0805);
    expect(km).toBeGreaterThan(1.3);
    expect(km).toBeLessThan(1.6);
  });

  it("is symmetric", () => {
    const forward = calculateDistance(51.04, -114.05, 51.06, -114.09);
    const backward = calculateDistance(51.06, -114.09, 51.04, -114.05);
    expect(forward).toBeCloseTo(backward, 12);
  });

  it("scales roughly linearly over short distances", () => {
    // A tenth of a degree of latitude is about 11.1 km anywhere on Earth.
    expect(calculateDistance(51, -114, 51.1, -114)).toBeCloseTo(11.12, 1);
  });
});

describe("calculateScore", () => {
  it("pays full marks across the plateau", () => {
    expect(calculateScore(0)).toBe(MAX_ROUND_SCORE);
    expect(calculateScore(0.05)).toBe(MAX_ROUND_SCORE);
    expect(calculateScore(0.1)).toBe(MAX_ROUND_SCORE);
  });

  it("leaves the plateau continuously, with no cliff at its edge", () => {
    // Deliberately NOT asserting a drop at 0.1001: decay is 0.0002 there, so
    // the curve is still 4999.9998 and rounds to full marks. That continuity is
    // the point. The old linear ramp's problem was a cliff, and a test that
    // demanded an instant drop here would be asking for a small one.
    expect(calculateScore(0.1001)).toBe(MAX_ROUND_SCORE);
    expect(calculateScore(0.15)).toBeLessThan(MAX_ROUND_SCORE);
    expect(calculateScore(0.15)).toBeGreaterThan(MAX_ROUND_SCORE * 0.98);
  });

  it("pays about half for a miss the size of an inner-city community", () => {
    // HALF_SCORE_KM is 0.5, measured from the edge of the 0.1 km plateau, so
    // 0.6 km is the half-score point by construction. This is the assertion
    // that ties the curve to the claim the about page makes.
    expect(calculateScore(0.6)).toBe(Math.round(MAX_ROUND_SCORE / 2));
  });

  it("decreases monotonically with distance", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let km = 0.1; km <= 25; km += 0.05) {
      const score = calculateScore(km);
      expect(score).toBeLessThanOrEqual(previous);
      previous = score;
    }
  });

  it("never leaves the valid range", () => {
    for (let km = 0; km <= 500; km += 0.25) {
      const score = calculateScore(km);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(MAX_ROUND_SCORE);
      expect(Number.isInteger(score)).toBe(true);
    }
  });

  it("quarters the payout for each doubling of error, out in the tail", () => {
    // The quadratic tail is the defining property of 1/(1 + x^2): far from the
    // plateau, doubling the error should cost about three quarters of the score.
    const near = calculateScore(4);
    const far = calculateScore(8);
    expect(near / far).toBeGreaterThan(3.5);
    expect(near / far).toBeLessThan(4.5);
  });

  it("still pays something well past the old 2 km cliff", () => {
    // The regression this curve exists to fix: the previous linear ramp scored
    // 0 at 2 km and everywhere beyond, so it could not tell a near miss from a
    // guess in another country.
    expect(calculateScore(2)).toBeGreaterThan(0);
    expect(calculateScore(3.41)).toBeGreaterThan(0);
    expect(calculateScore(20)).toBeGreaterThan(0);
  });

  it("scores an average uninformed click far below informed play", () => {
    // A random click inside the playable area lands about 1.34 km out. Local
    // knowledge that puts you within 500 m should be worth several times that.
    const uninformed = calculateScore(1.34);
    const informed = calculateScore(0.5);
    expect(informed / uninformed).toBeGreaterThan(3);
  });

  it("fails closed on broken input rather than handing out a perfect round", () => {
    expect(calculateScore(Number.NaN)).toBe(0);
    expect(calculateScore(Number.POSITIVE_INFINITY)).toBe(0);
    // A negative distance must not fall through to the plateau branch.
    expect(calculateScore(-1)).toBe(0);
    expect(calculateScore(-0.0001)).toBe(0);
  });
});
