import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildRounds, headingFor, resolvePanorama } from "@/lib/panorama";
import type { LatLng } from "@/lib/types";

/**
 * lib/panorama reaches for the `google.maps` enums at call time, which do not
 * exist outside a browser with the Maps script loaded. Stubbing them is enough:
 * the StreetViewService itself is a parameter, so it can be faked outright.
 */
beforeAll(() => {
  (globalThis as unknown as { google: unknown }).google = {
    maps: {
      StreetViewSource: { OUTDOOR: "outdoor" },
      StreetViewStatus: {
        OK: "OK",
        ZERO_RESULTS: "ZERO_RESULTS",
        UNKNOWN_ERROR: "UNKNOWN_ERROR",
      },
    },
  };
});

/** A StreetViewPanoramaData shaped like the one the Maps SDK hands back. */
function panoData(panoId: string, lat: number, lng: number) {
  return {
    location: {
      pano: panoId,
      latLng: { lat: () => lat, lng: () => lng },
    },
  };
}

/**
 * A fake service driven by a per-call responder, so a test can decide which
 * candidates resolve and which come back empty.
 */
function fakeService(
  responder: (request: { location: LatLng }, index: number) => unknown,
) {
  let index = 0;
  const calls: Array<Record<string, unknown>> = [];
  const service = {
    getPanorama(
      request: Record<string, unknown>,
      callback: (data: unknown, status: string) => void,
    ) {
      calls.push(request);
      const result = responder(
        request as unknown as { location: LatLng },
        index,
      );
      index += 1;
      callback(result, result ? "OK" : "ZERO_RESULTS");
    },
  };
  return { service, calls };
}

describe("headingFor", () => {
  it("is deterministic for the same coordinate", () => {
    const point = { lat: 51.0447, lng: -114.0719 };
    expect(headingFor(point)).toBe(headingFor(point));
    expect(headingFor(point)).toBe(headingFor({ ...point }));
  });

  it("always lands inside a compass bearing", () => {
    for (let i = 0; i < 500; i += 1) {
      const heading = headingFor({
        lat: 51.03 + i * 0.00004,
        lng: -114.09 + i * 0.00008,
      });
      expect(heading).toBeGreaterThanOrEqual(0);
      expect(heading).toBeLessThan(360);
    }
  });

  it("gives nearby but distinct coordinates different bearings", () => {
    // If the hash collapsed on close inputs, every round in one block would
    // face the same way.
    const headings = new Set(
      Array.from({ length: 50 }, (_, i) =>
        headingFor({ lat: 51.0447 + i * 0.0001, lng: -114.0719 }),
      ),
    );
    expect(headings.size).toBeGreaterThan(40);
  });

  it("spreads across the compass rather than clustering", () => {
    const buckets = new Set(
      Array.from({ length: 200 }, (_, i) =>
        Math.floor(headingFor({ lat: 51.04 + i * 0.0003, lng: -114.07 }) / 45),
      ),
    );
    expect(buckets.size).toBe(8);
  });
});

describe("resolvePanorama", () => {
  it("asks for outdoor imagery only", () => {
    // Indoor panoramas are unguessable and break the premise of reading the
    // street, so the filter is load bearing rather than cosmetic.
    const { service, calls } = fakeService(() => panoData("p1", 51.04, -114.07));
    void resolvePanorama(service as never, { lat: 51.04, lng: -114.07 });
    expect(calls[0]!.source).toBe("outdoor");
    expect(calls[0]!.radius).toBeGreaterThan(0);
  });

  it("answers with the panorama's own position, not the stored candidate", () => {
    // The player is standing where the panorama is. Scoring against the stored
    // coordinate instead would mark a perfect guess as a near miss by up to the
    // whole search radius.
    const { service } = fakeService(() => panoData("p1", 51.0499, -114.0611));
    return resolvePanorama(service as never, {
      lat: 51.04,
      lng: -114.07,
    }).then((round) => {
      expect(round).not.toBeNull();
      expect(round!.lat).toBe(51.0499);
      expect(round!.lng).toBe(-114.0611);
      expect(round!.panoId).toBe("p1");
      // ...and the heading follows the resolved point, not the requested one.
      expect(round!.heading).toBe(
        headingFor({ lat: 51.0499, lng: -114.0611 }),
      );
    });
  });

  it("resolves null rather than rejecting when there is no coverage", async () => {
    // A candidate with no panorama is an ordinary outcome the caller handles by
    // trying the next one, not an error worth unwinding the game load for.
    const { service } = fakeService(() => null);
    await expect(
      resolvePanorama(service as never, { lat: 51.04, lng: -114.07 }),
    ).resolves.toBeNull();
  });

  it("resolves null when a response comes back without a pano id", async () => {
    const service = {
      getPanorama(_r: unknown, cb: (d: unknown, s: string) => void) {
        cb({ location: { latLng: { lat: () => 51, lng: () => -114 } } }, "OK");
      },
    };
    await expect(
      resolvePanorama(service as never, { lat: 51.04, lng: -114.07 }),
    ).resolves.toBeNull();
  });
});

describe("buildRounds", () => {
  const pool = (n: number): LatLng[] =>
    Array.from({ length: n }, (_, i) => ({
      lat: 51.04 + i * 0.001,
      lng: -114.07 - i * 0.001,
    }));

  it("returns exactly the requested number of rounds", async () => {
    const { service } = fakeService((_r, i) =>
      panoData(`pano-${i}`, 51.04 + i * 0.001, -114.07),
    );
    const rounds = await buildRounds(service as never, pool(15), 5);
    expect(rounds).toHaveLength(5);
    expect(rounds.map((r) => r.panoId)).toEqual([
      "pano-0",
      "pano-1",
      "pano-2",
      "pano-3",
      "pano-4",
    ]);
  });

  it("stops as soon as it has enough instead of walking the whole pool", async () => {
    // One Firestore read already costs the whole collection; there is no reason
    // to also pay fifteen Street View lookups for a five-round game.
    const { service, calls } = fakeService((_r, i) =>
      panoData(`pano-${i}`, 51.04, -114.07),
    );
    await buildRounds(service as never, pool(15), 5);
    expect(calls).toHaveLength(5);
  });

  it("deduplicates panoramas two candidates snapped to", async () => {
    // Two stored coordinates 30 m apart can resolve to the same panorama, and a
    // game that shows the same street twice reads as a bug.
    const { service } = fakeService((_r, i) =>
      panoData(i < 3 ? "shared" : `pano-${i}`, 51.04, -114.07),
    );
    const rounds = await buildRounds(service as never, pool(15), 5);
    const ids = rounds.map((r) => r.panoId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(5);
  });

  it("skips candidates with no coverage and keeps going", async () => {
    const { service } = fakeService((_r, i) =>
      i % 2 === 0 ? null : panoData(`pano-${i}`, 51.04, -114.07),
    );
    const rounds = await buildRounds(service as never, pool(15), 5);
    expect(rounds).toHaveLength(5);
    expect(rounds.every((r) => r.panoId.startsWith("pano-"))).toBe(true);
  });

  it("returns fewer rounds rather than hanging when the pool runs dry", async () => {
    // The caller decides whether a short game is playable; this must not loop.
    const { service } = fakeService((_r, i) =>
      i < 2 ? panoData(`pano-${i}`, 51.04, -114.07) : null,
    );
    const rounds = await buildRounds(service as never, pool(6), 5);
    expect(rounds).toHaveLength(2);
  });

  it("returns nothing for an empty pool without calling the service", async () => {
    const { service, calls } = fakeService(() => panoData("p", 51, -114));
    await expect(buildRounds(service as never, [], 5)).resolves.toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("gives every round a playable pov", async () => {
    const { service } = fakeService((_r, i) =>
      panoData(`pano-${i}`, 51.04 + i * 0.001, -114.07),
    );
    const rounds = await buildRounds(service as never, pool(15), 5);
    for (const round of rounds) {
      expect(round.pitch).toBe(0);
      expect(round.zoom).toBeGreaterThan(0);
      expect(round.heading).toBeGreaterThanOrEqual(0);
      expect(round.heading).toBeLessThan(360);
    }
  });
});
