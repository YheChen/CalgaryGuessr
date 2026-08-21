// lib/location-generator.ts

import { hasStreetView } from "@/lib/streetview";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import type { LatLng } from "@/lib/types";

/**
 * The playable area: downtown Calgary and the communities immediately around
 * it. About 2.0 km north to south by 3.1 km east to west, which is the scale
 * the scoring curve in lib/game-utils.ts is calibrated against.
 */
export const CALGARY_BOUNDS = {
  north: 51.054582,
  south: 51.036649,
  west: -114.094705,
  east: -114.050461,
};

export type Location = LatLng;

/**
 * A random point inside the playable area.
 *
 * A SEEDING primitive, not part of gameplay: it is how the verifiedLocations
 * collection gets populated in the first place. Gameplay only ever reads that
 * collection.
 */
export function generateRandomLocation(): Location {
  const lat =
    Math.random() * (CALGARY_BOUNDS.north - CALGARY_BOUNDS.south) +
    CALGARY_BOUNDS.south;
  const lng =
    Math.random() * (CALGARY_BOUNDS.east - CALGARY_BOUNDS.west) +
    CALGARY_BOUNDS.west;
  return { lat, lng };
}

/** Whether a candidate has Street View imagery. Seeding-side check. */
export async function validateStreetView(location: Location): Promise<boolean> {
  return await hasStreetView(location.lat, location.lng);
}

const CACHE_KEY = "cg_location_pool_v1";

/**
 * The whole verified location pool.
 *
 * READ ONLY. An earlier version fell through to generating candidates and
 * writing them back with addDoc when the pool came up short, which meant an
 * ordinary page load could start writing to Firestore from the browser. The
 * round builder now over-fetches candidates and skips the ones Street View
 * cannot resolve, so a short pool degrades to a shorter game rather than to a
 * write. Seed the collection with the scripts in scripts/ instead.
 *
 * Cached in sessionStorage for the tab's lifetime. Firestore bills per document
 * READ, and a getDocs over a collection with no limit costs one read per
 * document, so without this every "play again" re-bought the entire pool. A tab
 * lifetime is the right window: long enough to cover a session of repeat games,
 * short enough that newly seeded locations appear without anyone clearing
 * anything.
 *
 * The whole pool, not a slice, because the daily challenge needs the same
 * starting set for everyone before it applies its seeded shuffle.
 */
export async function getAllLocations(): Promise<Location[]> {
  const cached = readCache();
  if (cached) {
    return cached;
  }

  const snapshot = await getDocs(collection(db, "verifiedLocations"));
  const all: Location[] = snapshot.docs
    .map((document) => {
      const data = document.data();
      return { lat: data.lat as number, lng: data.lng as number };
    })
    // A malformed document must not become a round at coordinates (NaN, NaN),
    // which Street View would resolve nowhere and scoring would turn into a
    // blank score.
    .filter(
      (location) =>
        Number.isFinite(location.lat) && Number.isFinite(location.lng),
    );

  writeCache(all);
  return all;
}

function readCache(): Location[] | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }
    const locations = parsed.filter(
      (entry): entry is Location =>
        typeof entry === "object" &&
        entry !== null &&
        Number.isFinite((entry as Location).lat) &&
        Number.isFinite((entry as Location).lng),
    );
    return locations.length > 0 ? locations : null;
  } catch {
    // Blocked storage or corrupt payload: fall through to a live read.
    return null;
  }
}

function writeCache(locations: Location[]): void {
  if (typeof window === "undefined" || locations.length === 0) {
    return;
  }
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(locations));
  } catch {
    // Quota or blocked storage. The cache is an optimisation, not a
    // requirement, so a failure here costs reads and nothing else.
  }
}
