import type { GameRound, LatLng } from "@/lib/types";

/**
 * Turning a stored coordinate into a playable round, in the browser.
 *
 * Toronto precomputes pano ids on a server and stores them alongside each
 * location. Calgary has no backend, so the Maps JS API does the same job here:
 * StreetViewService.getPanorama snaps a stored coordinate to the nearest real
 * panorama and hands back its id, which is what makes a round reproducible and
 * what lets the next round be prefetched while results are on screen.
 */

/** Metres around a stored location we will accept a panorama from. */
const SEARCH_RADIUS_M = 60;

/**
 * How many candidates to resolve at once.
 *
 * Bounded rather than unbounded so a large candidate pool cannot fire fifty
 * concurrent Street View lookups on game start; five at a time fills a
 * five-round game in one wave when every candidate resolves, which is the
 * normal case for a curated pool.
 */
const RESOLVE_BATCH = 5;

/**
 * A stable heading for a location, in degrees clockwise from north.
 *
 * FNV-1a over the fixed-precision coordinate. Deterministic on purpose: the
 * previous implementation rolled Math.random() inside the panorama's effect, so
 * the view silently swung to a new bearing on every re-render of the round the
 * player was in the middle of solving. Deriving it from the coordinate means
 * one location always faces one way, which is also reproducible when debugging
 * a round that looked wrong.
 */
export function headingFor({ lat, lng }: LatLng): number {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  // Tenth-of-a-degree resolution is far finer than anyone can perceive, and
  // keeps the value off suspiciously round bearings.
  return ((hash >>> 0) % 3600) / 10;
}

/**
 * The playable round at a stored coordinate, or null if Street View has no
 * outdoor imagery within {@link SEARCH_RADIUS_M}.
 *
 * Resolves rather than rejects on failure: a candidate with no panorama is an
 * ordinary outcome that the caller handles by trying the next one, not an
 * error.
 */
export function resolvePanorama(
  service: google.maps.StreetViewService,
  location: LatLng,
): Promise<GameRound | null> {
  return new Promise((resolve) => {
    service.getPanorama(
      {
        location,
        radius: SEARCH_RADIUS_M,
        // Indoor panoramas (shop interiors, museum walkthroughs) are
        // unguessable and break the premise of reading the street.
        source: google.maps.StreetViewSource.OUTDOOR,
      },
      (data, status) => {
        if (
          status !== google.maps.StreetViewStatus.OK ||
          !data?.location?.pano ||
          !data.location.latLng
        ) {
          resolve(null);
          return;
        }

        const latLng = data.location.latLng;
        const answer: LatLng = { lat: latLng.lat(), lng: latLng.lng() };

        resolve({
          ...answer,
          panoId: data.location.pano,
          heading: headingFor(answer),
          pitch: 0,
          zoom: 1,
        });
      },
    );
  });
}

/**
 * Resolve `count` playable rounds from a candidate pool.
 *
 * Walks the pool in bounded batches and stops as soon as it has enough, so a
 * healthy pool costs exactly one wave of lookups. Panoramas are deduplicated by
 * id because two stored coordinates 30 m apart can snap to the same panorama,
 * and a game that shows the same street twice reads as a bug.
 *
 * Returns fewer than `count` when the pool is exhausted; the caller decides
 * whether that is playable.
 */
export async function buildRounds(
  service: google.maps.StreetViewService,
  candidates: LatLng[],
  count: number,
): Promise<GameRound[]> {
  const rounds: GameRound[] = [];
  const seen = new Set<string>();

  for (
    let offset = 0;
    offset < candidates.length && rounds.length < count;
    offset += RESOLVE_BATCH
  ) {
    const batch = candidates.slice(offset, offset + RESOLVE_BATCH);
    const resolved = await Promise.all(
      batch.map((candidate) => resolvePanorama(service, candidate)),
    );

    for (const round of resolved) {
      if (!round || seen.has(round.panoId) || rounds.length >= count) {
        continue;
      }
      seen.add(round.panoId);
      rounds.push(round);
    }
  }

  return rounds;
}
