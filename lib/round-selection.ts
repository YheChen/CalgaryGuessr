import type { LatLng } from "@/lib/types";

/**
 * Choosing which stored locations become a game.
 *
 * Pure on purpose, and separate from the Firestore read, because the daily
 * challenge's whole premise is that two players who load the same pool on the
 * same date get the same five rounds. That is a property worth being able to
 * test without a network.
 */

/** Deterministic PRNG (mulberry32). Same seed, same sequence, everywhere. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over a string, for turning a date key into a PRNG seed. */
export function seedFromString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Fisher-Yates. `Array.prototype.sort` with a random comparator is not a fair
 * shuffle: the result depends on the engine's sort algorithm and biases badly.
 */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = swap;
  }
  return shuffled;
}

/**
 * A canonical ordering for a pool of locations.
 *
 * The daily seeded shuffle is only reproducible if it starts from the same
 * sequence for everyone. Firestore's default document order is stable in
 * practice, but relying on that would make the daily silently depend on
 * something no test covers and no API guarantees, so the order is imposed here
 * instead.
 */
export function sortLocations(items: LatLng[]): LatLng[] {
  return [...items].sort((a, b) =>
    a.lat === b.lat ? a.lng - b.lng : a.lat - b.lat,
  );
}

/** A fresh random selection, for a classic game. */
export function pickClassicCandidates(
  all: LatLng[],
  count: number,
): LatLng[] {
  return shuffle(all).slice(0, count);
}

/**
 * The selection for a given Calgary date, identical for every player.
 *
 * Depends only on the date key and the pool's contents, so two browsers agree
 * without a server. The one thing that can shift a daily mid-day is the pool
 * itself changing, which is why gameplay never writes to it.
 */
export function pickDailyCandidates(
  all: LatLng[],
  dateKey: string,
  count: number,
): LatLng[] {
  const ordered = sortLocations(all);
  const rng = mulberry32(seedFromString(dateKey));
  return shuffle(ordered, rng).slice(0, count);
}
