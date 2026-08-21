import { describe, expect, it } from "vitest";
import {
  mulberry32,
  pickClassicCandidates,
  pickDailyCandidates,
  seedFromString,
  shuffle,
  sortLocations,
} from "@/lib/round-selection";
import type { LatLng } from "@/lib/types";

const pool = (n: number): LatLng[] =>
  Array.from({ length: n }, (_, i) => ({
    lat: 51.0366 + (i * 0.0018) % 0.018,
    lng: -114.0947 + (i * 0.0031) % 0.044,
  }));

const key = (p: LatLng) => `${p.lat},${p.lng}`;

describe("mulberry32", () => {
  it("is reproducible for a seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    expect(Array.from({ length: 20 }, a)).toEqual(
      Array.from({ length: 20 }, b),
    );
  });

  it("diverges for different seeds", () => {
    const a = Array.from({ length: 20 }, mulberry32(1));
    const b = Array.from({ length: 20 }, mulberry32(2));
    expect(a).not.toEqual(b);
  });

  it("stays in [0, 1)", () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 5000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("seedFromString", () => {
  it("is stable for a value", () => {
    expect(seedFromString("2026-07-01")).toBe(seedFromString("2026-07-01"));
  });

  it("separates adjacent dates", () => {
    // Consecutive days must not collide, or two days would deal the same game.
    const seeds = new Set(
      Array.from({ length: 60 }, (_, i) =>
        seedFromString(`2026-07-${String(i + 1).padStart(2, "0")}`),
      ),
    );
    expect(seeds.size).toBe(60);
  });

  it("returns an unsigned 32-bit integer", () => {
    const seed = seedFromString("2026-07-01");
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

describe("shuffle", () => {
  it("keeps every element exactly once", () => {
    const input = pool(30);
    const out = shuffle(input, mulberry32(7));
    expect(out).toHaveLength(input.length);
    expect(new Set(out.map(key))).toEqual(new Set(input.map(key)));
  });

  it("does not mutate its input", () => {
    const input = pool(10);
    const before = input.map(key);
    shuffle(input, mulberry32(7));
    expect(input.map(key)).toEqual(before);
  });

  it("is reproducible under a seeded rng", () => {
    const input = pool(30);
    expect(shuffle(input, mulberry32(7)).map(key)).toEqual(
      shuffle(input, mulberry32(7)).map(key),
    );
  });

  it("actually reorders", () => {
    const input = pool(30);
    expect(shuffle(input, mulberry32(7)).map(key)).not.toEqual(input.map(key));
  });
});

describe("sortLocations", () => {
  it("imposes one canonical order regardless of input order", () => {
    const input = pool(25);
    const reversed = [...input].reverse();
    expect(sortLocations(input).map(key)).toEqual(
      sortLocations(reversed).map(key),
    );
  });

  it("breaks latitude ties on longitude", () => {
    const out = sortLocations([
      { lat: 51.04, lng: -114.05 },
      { lat: 51.04, lng: -114.09 },
      { lat: 51.03, lng: -114.07 },
    ]);
    expect(out.map(key)).toEqual([
      "51.03,-114.07",
      "51.04,-114.09",
      "51.04,-114.05",
    ]);
  });

  it("does not mutate its input", () => {
    const input = pool(10);
    const before = input.map(key);
    sortLocations(input);
    expect(input.map(key)).toEqual(before);
  });
});

describe("pickDailyCandidates", () => {
  it("deals the same game to everyone on the same date", () => {
    // The entire premise of the daily. Two browsers, no server between them.
    const a = pickDailyCandidates(pool(40), "2026-07-01", 15);
    const b = pickDailyCandidates(pool(40), "2026-07-01", 15);
    expect(a.map(key)).toEqual(b.map(key));
  });

  it("does not depend on the order the pool arrived in", () => {
    // Firestore's document order is stable in practice but guaranteed nowhere,
    // so the selection must survive the pool coming back shuffled.
    const base = pool(40);
    const jumbled = shuffle(base, mulberry32(4242));
    expect(pickDailyCandidates(base, "2026-07-01", 15).map(key)).toEqual(
      pickDailyCandidates(jumbled, "2026-07-01", 15).map(key),
    );
  });

  it("deals a different game the next day", () => {
    const today = pickDailyCandidates(pool(40), "2026-07-01", 5);
    const tomorrow = pickDailyCandidates(pool(40), "2026-07-02", 5);
    expect(today.map(key)).not.toEqual(tomorrow.map(key));
  });

  it("keeps consecutive days from repeating for a whole month", () => {
    const firsts = Array.from({ length: 30 }, (_, i) =>
      key(
        pickDailyCandidates(
          pool(40),
          `2026-07-${String(i + 1).padStart(2, "0")}`,
          5,
        )[0]!,
      ),
    );
    // Not all distinct necessarily, but a healthy spread rather than one value.
    expect(new Set(firsts).size).toBeGreaterThan(15);
  });

  it("returns distinct locations, capped at the pool size", () => {
    const picked = pickDailyCandidates(pool(8), "2026-07-01", 15);
    expect(picked).toHaveLength(8);
    expect(new Set(picked.map(key)).size).toBe(8);
  });

  it("handles an empty pool", () => {
    expect(pickDailyCandidates([], "2026-07-01", 5)).toEqual([]);
  });
});

describe("pickClassicCandidates", () => {
  it("returns the requested number of distinct locations", () => {
    const picked = pickClassicCandidates(pool(40), 15);
    expect(picked).toHaveLength(15);
    expect(new Set(picked.map(key)).size).toBe(15);
  });

  it("caps at the pool size", () => {
    expect(pickClassicCandidates(pool(6), 15)).toHaveLength(6);
  });

  it("varies between games", () => {
    // Unseeded, so this is probabilistic; over 20 draws from a pool of 40 an
    // identical first pick every time would mean it is not random at all.
    const firsts = new Set(
      Array.from({ length: 20 }, () => key(pickClassicCandidates(pool(40), 5)[0]!)),
    );
    expect(firsts.size).toBeGreaterThan(1);
  });
});
