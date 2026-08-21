import { describe, expect, it } from "vitest";
import { formatDistance, formatDistanceCompact } from "@/lib/format-distance";

describe("formatDistance", () => {
  it("writes sub-kilometre distances in whole metres", () => {
    expect(formatDistance(0.82)).toBe("820 m");
    expect(formatDistance(0.0004)).toBe("0 m");
    expect(formatDistance(0.9999)).toBe("1000 m");
  });

  it("writes a kilometre and over with two decimals", () => {
    expect(formatDistance(1)).toBe("1.00 km");
    expect(formatDistance(3.4149)).toBe("3.41 km");
    expect(formatDistance(12.5)).toBe("12.50 km");
  });

  it("states the absence of a guess rather than printing a zero", () => {
    // The bug this guards: a timed-out round used to render "0.00 km", which
    // reads as a perfect-distance round that somehow scored nothing.
    expect(formatDistance(null)).toBe("No guess");
    expect(formatDistance(undefined)).toBe("No guess");
    expect(formatDistance(Number.NaN)).toBe("No guess");
    expect(formatDistance(Number.POSITIVE_INFINITY)).toBe("No guess");
  });

  it("still formats a genuine zero distance", () => {
    expect(formatDistance(0)).toBe("0 m");
  });
});

describe("formatDistanceCompact", () => {
  it("uses one decimal so map labels stay narrow", () => {
    expect(formatDistanceCompact(3.4149)).toBe("3.4 km");
    expect(formatDistanceCompact(1)).toBe("1.0 km");
  });

  it("shares the metres form below a kilometre", () => {
    expect(formatDistanceCompact(0.82)).toBe("820 m");
  });

  it("returns null when there is nothing to label", () => {
    // Null rather than "No guess": the caller draws no line without a
    // distance, so there is no line to hang a label on.
    expect(formatDistanceCompact(null)).toBeNull();
    expect(formatDistanceCompact(undefined)).toBeNull();
    expect(formatDistanceCompact(Number.NaN)).toBeNull();
  });

  it("is never wider than the long form", () => {
    for (const km of [0.001, 0.5, 0.999, 1, 9.99, 123.456]) {
      const long = formatDistance(km);
      const short = formatDistanceCompact(km);
      expect(short).not.toBeNull();
      expect(short!.length).toBeLessThanOrEqual(long.length);
    }
  });
});
