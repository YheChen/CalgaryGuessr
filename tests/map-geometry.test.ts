import { describe, expect, it } from "vitest";
import { midpoint } from "@/lib/map-geometry";

describe("midpoint", () => {
  it("halves the gap between two points", () => {
    // toBeCloseTo, not toEqual: averaging binary floats lands on
    // 51.010000000000005, and asserting exact equality here would be testing
    // IEEE 754 rather than the function.
    const mid = midpoint({ lat: 51, lng: -114 }, { lat: 51.02, lng: -114.04 });
    expect(mid.lat).toBeCloseTo(51.01, 10);
    expect(mid.lng).toBeCloseTo(-114.02, 10);
  });

  it("returns the point itself when both ends coincide", () => {
    const point = { lat: 51.0447, lng: -114.0719 };
    expect(midpoint(point, point)).toEqual(point);
  });

  it("is order independent", () => {
    const a = { lat: 51.03, lng: -114.09 };
    const b = { lat: 51.06, lng: -114.05 };
    const forward = midpoint(a, b);
    const backward = midpoint(b, a);
    expect(forward.lat).toBeCloseTo(backward.lat, 12);
    expect(forward.lng).toBeCloseTo(backward.lng, 12);
  });

  it("lands inside the bounding box of its inputs", () => {
    const a = { lat: 51.036649, lng: -114.094705 };
    const b = { lat: 51.054582, lng: -114.050461 };
    const mid = midpoint(a, b);
    expect(mid.lat).toBeGreaterThan(a.lat);
    expect(mid.lat).toBeLessThan(b.lat);
    expect(mid.lng).toBeGreaterThan(a.lng);
    expect(mid.lng).toBeLessThan(b.lng);
  });
});
