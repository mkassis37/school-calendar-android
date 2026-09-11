import { describe, expect, it } from "vitest";
import { addDays, EVENT_META, homeworkProgress, notificationSoundForType, startOfWeek, toDateKey, weeklyStudySummary } from "../lib/calendar-utils";

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

  it("calculates homework completion as a bounded percentage", () => {
    expect(homeworkProgress(4, 1)).toBe(25);
    expect(homeworkProgress(0, 0)).toBe(0);
    expect(homeworkProgress(4, 9)).toBe(100);
  });

  it("selects different notification sounds for homework and exams", () => {
    const sounds = { homework: "homework_soft.wav", exam: "exam_alert.wav" };
    expect(notificationSoundForType("homework", sounds)).toBe("homework_soft.wav");
    expect(notificationSoundForType("exam", sounds)).toBe("exam_alert.wav");
  });

  it("summarizes only the current Monday-to-Sunday school week", () => {
    const events = [
      { date: "2026-09-07", type: "homework" as const, done: true },
      { date: "2026-09-08", type: "homework" as const, done: false },
      { date: "2026-09-09", type: "exam" as const, done: true },
      { date: "2026-09-14", type: "exam" as const, done: false },
    ];
    expect(weeklyStudySummary(events, new Date(2026, 8, 11))).toMatchObject({ homeworkTotal: 2, homeworkDone: 1, homeworkPercent: 50, examTotal: 1, examDone: 1, examPercent: 100, total: 3, done: 2 });
  });
});
