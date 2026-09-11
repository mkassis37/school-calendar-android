import { describe, expect, it } from "vitest";
import { addDays, EVENT_META, startOfWeek, toDateKey } from "../lib/calendar-utils";

describe("calendar helpers", () => {
  it("formats a local date as an ISO calendar key", () => {
    expect(toDateKey(new Date(2026, 8, 11))).toBe("2026-09-11");
  });

  it("moves dates without mutating the source", () => {
    const source = new Date(2026, 8, 11);
    const moved = addDays(source, 3);
    expect(toDateKey(moved)).toBe("2026-09-14");
    expect(toDateKey(source)).toBe("2026-09-11");
  });

  it("starts the school week on Monday", () => {
    const monday = startOfWeek(new Date(2026, 8, 13));
    expect(toDateKey(monday)).toBe("2026-09-07");
  });

  it("provides a visual category for every supported event type", () => {
    expect(Object.keys(EVENT_META)).toEqual(["lesson", "homework", "exam", "evaluation", "activity"]);
    expect(EVENT_META.exam.label).toBe("امتحان");
    expect(EVENT_META.homework.color).toMatch(/^#/);
  });
});
