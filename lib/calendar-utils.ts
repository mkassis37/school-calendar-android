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

export function formatDisplayTime(time: string, format: 12 | 24) {
  const [rawHour, rawMinute] = time.split(":").map(Number);
  if (format === 24 || !Number.isFinite(rawHour) || !Number.isFinite(rawMinute)) return time;
  const period = rawHour >= 12 ? "مساءً" : "صباحًا";
  const hour = rawHour % 12 || 12;
  return `${hour}:${String(rawMinute).padStart(2, "0")} ${period}`;
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
