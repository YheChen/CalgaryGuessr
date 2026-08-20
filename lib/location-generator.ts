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

/**
 * A shuffled slice of the verified location pool.
 *
 * READ ONLY. The previous version fell through to generating candidates and
 * writing them back with addDoc when the pool came up short, which meant an
 * ordinary page load could start writing to Firestore from the browser. It
 * never fired in practice, because the pool is larger than a game, and the
 * round builder now over-fetches candidates and skips the ones Street View
 * cannot resolve, so a short pool degrades to a shorter game rather than to a
 * write. Seed the collection with the scripts in scripts/ instead.
 */
export async function getLocationPool(count = 10): Promise<Location[]> {
  const snapshot = await getDocs(collection(db, "verifiedLocations"));

  const all: Location[] = snapshot.docs.map((document) => {
    const data = document.data();
    return { lat: data.lat as number, lng: data.lng as number };
  });

  return shuffle(all).slice(0, count);
}

/** Fisher-Yates. `Array.sort` with a random comparator is not a fair shuffle. */
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = swap;
  }
  return shuffled;
}
