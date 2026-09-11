export type EventType = "lesson" | "homework" | "exam" | "evaluation" | "activity";

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  next.setDate(next.getDate() - ((day + 6) % 7));
  next.setHours(0, 0, 0, 0);
  return next;
}

export function homeworkProgress(total: number, completed: number) {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, Math.min(completed, total)) / total) * 100);
}

export function notificationSoundForType(type: EventType, sounds: { homework: string; exam: string }) {
  return type === "exam" ? sounds.exam : sounds.homework;
}

export type SecurityScanResult = { safe: boolean; checked: number; invalid: number; message: string };

export function inspectCalendarData(events: unknown): SecurityScanResult {
  if (!Array.isArray(events)) return { safe: false, checked: 0, invalid: 1, message: "بيانات التقويم غير صالحة" };
  let invalid = 0;
  for (const event of events) {
    if (!event || typeof event !== "object") { invalid += 1; continue; }
    const item = event as Record<string, unknown>;
    const validType = ["lesson", "homework", "exam", "evaluation", "activity"].includes(String(item.type));
    const validText = ["id", "title", "subject", "date", "time"].every((key) => typeof item[key] === "string" && String(item[key]).length <= 500);
    const validReminder = typeof item.reminderMinutes === "number" && Number.isFinite(item.reminderMinutes) && item.reminderMinutes >= 0 && item.reminderMinutes <= 10080;
    if (!validType || !validText || !validReminder || typeof item.done !== "boolean") invalid += 1;
  }
  return { safe: invalid === 0, checked: events.length, invalid, message: invalid === 0 ? "لم يتم العثور على بيانات غير سليمة" : `تم العثور على ${invalid} عنصر غير سليم` };
}

export function weeklyStudySummary(events: Array<{ date: string; type: EventType; done: boolean }>, referenceDate = new Date()) {
  const weekStart = startOfWeek(referenceDate);
  const weekKeys = new Set(Array.from({ length: 7 }, (_, index) => toDateKey(addDays(weekStart, index))));
  const current = events.filter((event) => weekKeys.has(event.date) && (event.type === "homework" || event.type === "exam"));
  const homeworkTotal = current.filter((event) => event.type === "homework").length;
  const homeworkDone = current.filter((event) => event.type === "homework" && event.done).length;
  const examTotal = current.filter((event) => event.type === "exam").length;
  const examDone = current.filter((event) => event.type === "exam" && event.done).length;
  return { homeworkTotal, homeworkDone, homeworkPercent: homeworkProgress(homeworkTotal, homeworkDone), examTotal, examDone, examPercent: homeworkProgress(examTotal, examDone), total: current.length, done: current.filter((event) => event.done).length };
}

export const EVENT_META: Record<EventType, { label: string; color: string; soft: string; icon: string }> = {
  lesson: { label: "درس", color: "#2878C8", soft: "#E7F0FB", icon: "menu-book" },
  homework: { label: "واجب", color: "#E26B45", soft: "#FFF0EB", icon: "assignment" },
  exam: { label: "امتحان", color: "#C04A75", soft: "#FCECF2", icon: "edit-note" },
  evaluation: { label: "تقييم", color: "#8559B4", soft: "#F2EBF8", icon: "fact-check" },
  activity: { label: "نشاط", color: "#0F8C7D", soft: "#E5F6F2", icon: "local-activity" },
};
