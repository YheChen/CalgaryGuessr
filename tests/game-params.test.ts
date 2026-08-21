import { describe, expect, it } from "vitest";
import { parseGameMode } from "@/lib/game-params";

describe("parseGameMode", () => {
  it("reads the daily mode", () => {
    expect(parseGameMode("?mode=daily")).toBe("daily");
    expect(parseGameMode("mode=daily")).toBe("daily");
    expect(parseGameMode("?foo=1&mode=daily&bar=2")).toBe("daily");
  });

  it("defaults to classic", () => {
    expect(parseGameMode("")).toBe("classic");
    expect(parseGameMode("?")).toBe("classic");
    expect(parseGameMode("?mode=classic")).toBe("classic");
  });

  it("falls back to classic for an unknown mode rather than refusing to start", () => {
    expect(parseGameMode("?mode=weekly")).toBe("classic");
    expect(parseGameMode("?mode=")).toBe("classic");
    // Case sensitive on purpose: the app only ever generates the lowercase
    // form, so anything else is a hand-edited URL and classic is the safe read.
    expect(parseGameMode("?mode=DAILY")).toBe("classic");
  });

  it("is not confused by a malformed query string", () => {
    expect(parseGameMode("?%%%")).toBe("classic");
    expect(parseGameMode("?mode")).toBe("classic");
  });
});
