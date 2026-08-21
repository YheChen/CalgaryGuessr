import { describe, expect, it } from "vitest";
import {
  calgaryDateKey,
  dateKeyToUtc,
  daysBetweenKeys,
  formatDayLabel,
} from "@/lib/date-calgary";

describe("calgaryDateKey", () => {
  it("uses Mountain Time, not Eastern", () => {
    // 2026-07-01T04:30:00Z is 22:30 on Jun 30 in Calgary (MDT, UTC-6) but
    // already 00:30 on Jul 1 in Toronto (EDT, UTC-4). Getting this wrong would
    // roll the daily challenge over two hours early for everyone in Alberta.
    expect(calgaryDateKey(new Date("2026-07-01T04:30:00Z"))).toBe("2026-06-30");
  });

  it("rolls the day at Calgary midnight", () => {
    expect(calgaryDateKey(new Date("2026-07-01T05:59:59Z"))).toBe("2026-06-30");
    expect(calgaryDateKey(new Date("2026-07-01T06:00:01Z"))).toBe("2026-07-01");
  });

  it("handles standard time, when the offset is UTC-7", () => {
    expect(calgaryDateKey(new Date("2026-01-15T06:59:59Z"))).toBe("2026-01-14");
    expect(calgaryDateKey(new Date("2026-01-15T07:00:01Z"))).toBe("2026-01-15");
  });

  it("always produces a sortable YYYY-MM-DD key", () => {
    for (const iso of [
      "2026-01-01T12:00:00Z",
      "2026-03-08T09:00:00Z",
      "2026-11-01T08:00:00Z",
      "2026-12-31T23:00:00Z",
    ]) {
      expect(calgaryDateKey(new Date(iso))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("dateKeyToUtc", () => {
  it("maps a key to UTC midnight", () => {
    expect(dateKeyToUtc("2026-06-30")).toBe(Date.UTC(2026, 5, 30));
  });

  it("rejects anything that is not a date", () => {
    for (const bad of ["", "nonsense", "2026-13-01", "2026-00-10", "2026-06-32", "2026-06"]) {
      expect(dateKeyToUtc(bad)).toBeNull();
    }
  });
});

describe("daysBetweenKeys", () => {
  it("counts whole days forwards and backwards", () => {
    expect(daysBetweenKeys("2026-06-30", "2026-07-01")).toBe(1);
    expect(daysBetweenKeys("2026-06-30", "2026-06-30")).toBe(0);
    expect(daysBetweenKeys("2026-07-01", "2026-06-30")).toBe(-1);
  });

  it("crosses a month and a year boundary", () => {
    expect(daysBetweenKeys("2026-01-31", "2026-02-01")).toBe(1);
    expect(daysBetweenKeys("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("is unaffected by daylight saving, which is why it goes through UTC", () => {
    // Mar 8 2026 is the spring-forward date. A local-midnight implementation
    // would return 0 or 2 here as the 23-hour day rounds.
    expect(daysBetweenKeys("2026-03-07", "2026-03-08")).toBe(1);
    expect(daysBetweenKeys("2026-11-01", "2026-11-02")).toBe(1);
  });

  it("is null when either side is unparseable", () => {
    expect(daysBetweenKeys("bad", "2026-07-01")).toBeNull();
    expect(daysBetweenKeys("2026-07-01", "bad")).toBeNull();
  });
});

describe("formatDayLabel", () => {
  it("reads the key directly instead of parsing it as a Date", () => {
    // new Date("2026-07-01") is UTC midnight, which is Jun 30 in Calgary. This
    // is exactly the off-by-one the function exists to avoid.
    expect(formatDayLabel("2026-07-01")).toBe("Jul 1");
    expect(formatDayLabel("2026-01-09")).toBe("Jan 9");
    expect(formatDayLabel("2026-12-25")).toBe("Dec 25");
  });

  it("falls back to the raw value when it is not a key", () => {
    expect(formatDayLabel("nonsense")).toBe("nonsense");
  });
});
