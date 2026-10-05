import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { notificationSoundForType } from "@/lib/calendar-utils";
import { createTRPCClient } from "@/lib/trpc";

export type EventType = "lesson" | "homework" | "exam" | "evaluation" | "activity";
export type NotificationSound = "homework" | "exam";
export type ReminderDefaults = { homework: number; exam: number };

export type CalendarEvent = {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  type: EventType;
  done: boolean;
  reminderMinutes: number;
  notes?: string;
  notificationId?: string;
  repeatWeekly?: boolean;
};

export type NewEvent = Omit<CalendarEvent, "id" | "done" | "notificationId"> & { repeatWeekly?: boolean };

type CalendarContextValue = {
  events: CalendarEvent[];
  hydrated: boolean;
  notificationsEnabled: boolean;
  subjectColors: Record<string, string>;
  notificationSounds: Record<NotificationSound, string>;
  reminderDefaults: ReminderDefaults;
  addEvent: (event: NewEvent) => Promise<void>;
  updateEvent: (id: string, event: NewEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  toggleEvent: (id: string) => Promise<void>;
  requestNotifications: () => Promise<boolean>;
  setSubjectColor: (subject: string, color: string) => Promise<void>;
  setNotificationSound: (kind: NotificationSound, sound: string) => Promise<void>;
  setReminderDefault: (kind: keyof ReminderDefaults, minutes: number) => Promise<void>;
  addSubject: (subject: string, color: string) => Promise<void>;
  removeSubject: (subject: string) => Promise<void>;
  exportData: () => Promise<void>;
  importData: (confirmReplacement: () => Promise<boolean>) => Promise<{ imported: boolean; message: string }>;
  alarmEnabled: boolean;
  alarmTime: string;
  setDailyAlarm: (enabled: boolean, time: string) => Promise<void>;
  previewAlarmSound: () => Promise<void>;
  timeFormat: 12 | 24;
  setTimeFormat: (format: 12 | 24) => Promise<void>;
  getCloudPayload: () => string;
  restoreCloudPayload: (payload: string) => Promise<{ events: number; subjects: number }>;
};

type TransferData = { format: "school-calendar"; version: 1; exportedAt: string; events: CalendarEvent[]; subjectColors: Record<string, string>; reminderDefaults: ReminderDefaults };

const EVENT_TYPES = new Set<EventType>(["lesson", "homework", "exam", "evaluation", "activity"]);
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_KEY = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isValidEvent(value: unknown): value is CalendarEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<CalendarEvent>;
  const reminderMinutes = event.reminderMinutes;
  return typeof event.id === "string" && event.id.length > 0 && event.id.length <= 100 &&
    typeof event.title === "string" && event.title.length > 0 && event.title.length <= 200 &&
    typeof event.subject === "string" && event.subject.length <= 100 &&
    typeof event.date === "string" && DATE_KEY.test(event.date) &&
    typeof event.time === "string" && TIME_KEY.test(event.time) &&
    typeof event.type === "string" && EVENT_TYPES.has(event.type as EventType) &&
    typeof event.done === "boolean" && typeof reminderMinutes === "number" && Number.isInteger(reminderMinutes) && reminderMinutes >= 0 && reminderMinutes <= 10080 &&
    (event.notes === undefined || (typeof event.notes === "string" && event.notes.length <= 10000)) &&
    (event.repeatWeekly === undefined || typeof event.repeatWeekly === "boolean");
}

function isValidColorMap(value: unknown): value is Record<string, string> {
  return !!value && typeof value === "object" && Object.keys(value).length <= 200 && Object.entries(value).every(([name, color]) => name.length > 0 && name.length <= 100 && typeof color === "string" && HEX_COLOR.test(color));
}

function isValidReminderDefaults(value: unknown): value is ReminderDefaults {
  if (!value || typeof value !== "object") return false;
  const defaults = value as Partial<ReminderDefaults>;
  return typeof defaults.homework === "number" && Number.isInteger(defaults.homework) && defaults.homework >= 0 && defaults.homework <= 10080 && typeof defaults.exam === "number" && Number.isInteger(defaults.exam) && defaults.exam >= 0 && defaults.exam <= 10080;
}

function isNotificationSounds(value: unknown): value is Record<NotificationSound, string> {
  return !!value && typeof value === "object" && (value as Record<string, unknown>).homework === "homework_soft.wav" && (value as Record<string, unknown>).exam === "exam_alert.wav";
}

function isValidTransferData(value: unknown): value is TransferData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<TransferData>;
  return data.format === "school-calendar" && data.version === 1 && Array.isArray(data.events) && data.events.length <= 5000 && data.events.every(isValidEvent) && isValidColorMap(data.subjectColors) && isValidReminderDefaults(data.reminderDefaults);
}

function safeStoredJson<T>(raw: string | null, fallback: T, validate: (value: unknown) => value is T): T {
  if (!raw) return fallback;
  try { const parsed: unknown = JSON.parse(raw); return validate(parsed) ? parsed : fallback; } catch { return fallback; }
}

function isEventArray(value: unknown): value is CalendarEvent[] { return Array.isArray(value) && value.length <= 5000 && value.every(isValidEvent); }

const STORAGE_KEY = "school-calendar-events-v1";
const NOTIFICATION_KEY = "school-calendar-notifications-v1";
const SUBJECT_COLORS_KEY = "school-calendar-subject-colors-v1";
const NOTIFICATION_SOUNDS_KEY = "school-calendar-notification-sounds-v1";
const REMINDER_DEFAULTS_KEY = "school-calendar-reminder-defaults-v1";
const ALARM_KEY = "school-calendar-alarm-v1";
const ALARM_TIME_KEY = "school-calendar-alarm-time-v1";
const TIME_FORMAT_KEY = "school-calendar-time-format-v1";
const MORNING_SUMMARY_KEY = "school-calendar-morning-summary-v1";
const MORNING_SUMMARY_DAYS = 30;
const MORNING_SUMMARY_HOUR = 7;
const MORNING_SUMMARY_MINUTE = 0;
const DEFAULT_NOTIFICATION_SOUNDS: Record<NotificationSound, string> = { homework: "homework_soft.wav", exam: "exam_alert.wav" };
const DEFAULT_REMINDER_DEFAULTS: ReminderDefaults = { homework: 60, exam: 1440 };
const DEFAULT_SUBJECT_COLORS: Record<string, string> = {};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
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

function seedEvents(): CalendarEvent[] {
  return [];
}

async function persist(events: CalendarEvent[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

async function scheduleEventReminder(event: CalendarEvent, notificationSounds = DEFAULT_NOTIFICATION_SOUNDS) {
  if (Platform.OS === "web" || event.reminderMinutes <= 0) return undefined;
  const [hours, minutes] = event.time.split(":").map(Number);
  const eventDate = parseDateKey(event.date);
  eventDate.setHours(hours, minutes, 0, 0);
  const triggerDate = new Date(eventDate.getTime() - event.reminderMinutes * 60_000);
  if (triggerDate.getTime() <= Date.now()) return undefined;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `تذكير: ${event.title}`,
        body: `${event.subject} · بعد ${event.reminderMinutes >= 60 ? `${event.reminderMinutes / 60} ساعة` : `${event.reminderMinutes} دقيقة`}`,
        sound: notificationSoundForType(event.type, notificationSounds),
        data: { eventId: event.id, eventType: event.type },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate, channelId: event.type === "exam" ? "school-calendar-exam" : "school-calendar-homework" },
    });
  } catch {
    return undefined;
  }
}

async function refreshMorningSummaries(events: CalendarEvent[]) {
  if (Platform.OS === "web") return;
  const raw = await AsyncStorage.getItem(MORNING_SUMMARY_KEY);
  if (raw) {
    try {
      const ids = JSON.parse(raw) as unknown;
      if (Array.isArray(ids)) {
        await Promise.all(ids.filter((id): id is string => typeof id === "string").map(async (id) => {
          try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
        }));
      }
    } catch {}
  }
  if (!(await AsyncStorage.getItem(NOTIFICATION_KEY)).includes("true")) {
    await AsyncStorage.setItem(MORNING_SUMMARY_KEY, "[]");
    return;
  }
  const ids: string[] = [];
  const now = new Date();
  for (let offset = 0; offset < MORNING_SUMMARY_DAYS; offset += 1) {
    const day = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), offset);
    const triggerDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), MORNING_SUMMARY_HOUR, MORNING_SUMMARY_MINUTE, 0, 0);
    if (triggerDate.getTime() <= now.getTime()) continue;
    const key = toDateKey(day);
    const dayEvents = events
      .filter((event) => event.date === key && !event.done)
      .sort((a, b) => a.time.localeCompare(b.time));
    const body = dayEvents.length
      ? dayEvents.map((event) => `${event.time} · ${event.title}${event.subject ? ` (${event.subject})` : ""}`).join(" | ")
      : "لا توجد مواعيد دراسية مسجلة لهذا اليوم.";
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: offset === 0 ? "مواعيد اليوم الدراسي" : "تذكير باليوم الدراسي",
          body,
          data: { type: "morning-summary", date: key },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      ids.push(id);
    } catch {}
  }
  await AsyncStorage.setItem(MORNING_SUMMARY_KEY, JSON.stringify(ids));
}

async function cancelReminder(notificationId?: string) {
  if (!notificationId || Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // The notification may already have fired or been removed by Android.
  }
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [subjectColors, setSubjectColors] = useState<Record<string, string>>(DEFAULT_SUBJECT_COLORS);
  const [notificationSounds, setNotificationSounds] = useState<Record<NotificationSound, string>>(DEFAULT_NOTIFICATION_SOUNDS);
  const [reminderDefaults, setReminderDefaults] = useState<ReminderDefaults>(DEFAULT_REMINDER_DEFAULTS);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmTime, setAlarmTime] = useState("07:00");
  const [timeFormat, setTimeFormatState] = useState<12 | 24>(24);
  const autoSyncReady = useRef(false);

  useEffect(() => {
    void (async () => {
      const [storedEvents, storedNotifications, storedSubjectColors, storedNotificationSounds, storedReminderDefaults, storedAlarm, storedAlarmTime, storedTimeFormat] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(NOTIFICATION_KEY),
        AsyncStorage.getItem(SUBJECT_COLORS_KEY),
        AsyncStorage.getItem(NOTIFICATION_SOUNDS_KEY),
        AsyncStorage.getItem(REMINDER_DEFAULTS_KEY),
        AsyncStorage.getItem(ALARM_KEY),
        AsyncStorage.getItem(ALARM_TIME_KEY),
        AsyncStorage.getItem(TIME_FORMAT_KEY),
      ]);
      setEvents(safeStoredJson(storedEvents, seedEvents(), isEventArray));
      setNotificationsEnabled(storedNotifications === "true");
      setSubjectColors(storedSubjectColors ? { ...DEFAULT_SUBJECT_COLORS, ...safeStoredJson(storedSubjectColors, {}, isValidColorMap) } : DEFAULT_SUBJECT_COLORS);
      setNotificationSounds(storedNotificationSounds ? safeStoredJson(storedNotificationSounds, DEFAULT_NOTIFICATION_SOUNDS, isNotificationSounds) : DEFAULT_NOTIFICATION_SOUNDS);
      setReminderDefaults(storedReminderDefaults ? { ...DEFAULT_REMINDER_DEFAULTS, ...safeStoredJson(storedReminderDefaults, DEFAULT_REMINDER_DEFAULTS, isValidReminderDefaults) } : DEFAULT_REMINDER_DEFAULTS);
      setAlarmEnabled(storedAlarm === "true"); setAlarmTime(storedAlarmTime ?? "07:00");
      setTimeFormatState(storedTimeFormat === "12" ? 12 : 24);
      setHydrated(true);
      if (storedNotifications === "true") await refreshMorningSummaries(safeStoredJson(storedEvents, seedEvents(), isEventArray));
    })();
  }, []);

  const addEvent = async (input: NewEvent) => {
    const instances = input.repeatWeekly ? Array.from({ length: 8 }, (_, index) => ({ ...input, date: toDateKey(addDays(parseDateKey(input.date), index * 7)) })) : [input];
    const created: CalendarEvent[] = [];
    for (const instance of instances) {
      const event: CalendarEvent = { ...instance, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, done: false };
      if (notificationsEnabled) event.notificationId = await scheduleEventReminder(event, notificationSounds);
      created.push(event);
    }
    const next = [...events, ...created];
    setEvents(next);
    await persist(next);
    await refreshMorningSummaries(next);
  };

  const updateEvent = async (id: string, input: NewEvent) => {
    const current = events.find((event) => event.id === id);
    if (!current) return;
    await cancelReminder(current.notificationId);
    const updated: CalendarEvent = { ...current, ...input, notificationId: notificationsEnabled ? await scheduleEventReminder({ ...current, ...input }, notificationSounds) : undefined };
    const next = events.map((event) => (event.id === id ? updated : event));
    setEvents(next);
    await persist(next);
    await refreshMorningSummaries(next);
  };

  const deleteEvent = async (id: string) => {
    const current = events.find((event) => event.id === id);
    await cancelReminder(current?.notificationId);
    const next = events.filter((event) => event.id !== id);
    setEvents(next);
    await persist(next);
    await refreshMorningSummaries(next);
  };

  const toggleEvent = async (id: string) => {
    const next = events.map((event) => (event.id === id ? { ...event, done: !event.done } : event));
    setEvents(next);
    await persist(next);
    await refreshMorningSummaries(next);
  };

  const requestNotifications = async () => {
    if (Platform.OS === "web") return false;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("school-calendar", {
        name: "تنبيهات الدراسة",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1AA394",
      });
      await Notifications.setNotificationChannelAsync("school-calendar-homework", { name: "تنبيهات الواجبات", importance: Notifications.AndroidImportance.HIGH, sound: notificationSounds.homework });
      await Notifications.setNotificationChannelAsync("school-calendar-exam", { name: "تنبيهات الامتحانات", importance: Notifications.AndroidImportance.HIGH, sound: notificationSounds.exam });
      await Notifications.setNotificationChannelAsync("school-calendar-alarm", { name: "منبه الدراسة", importance: Notifications.AndroidImportance.HIGH });
    }
    const current = await Notifications.getPermissionsAsync();
    const result = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
    const enabled = result.status === "granted";
    setNotificationsEnabled(enabled);
    await AsyncStorage.setItem(NOTIFICATION_KEY, String(enabled));
    if (enabled) {
      const refreshed = await Promise.all(events.map(async (event) => ({ ...event, notificationId: await scheduleEventReminder(event, notificationSounds) })));
      setEvents(refreshed);
      await persist(refreshed);
      await refreshMorningSummaries(refreshed);
    }
    return enabled;
  };

  const setSubjectColor = async (subject: string, color: string) => {
    const next = { ...subjectColors, [subject]: color };
    setSubjectColors(next);
    await AsyncStorage.setItem(SUBJECT_COLORS_KEY, JSON.stringify(next));
  };

  const setNotificationSound = async (kind: NotificationSound, sound: string) => {
    const next = { ...notificationSounds, [kind]: sound };
    setNotificationSounds(next);
    await AsyncStorage.setItem(NOTIFICATION_SOUNDS_KEY, JSON.stringify(next));
  };

  const setReminderDefault = async (kind: keyof ReminderDefaults, minutes: number) => {
    const next = { ...reminderDefaults, [kind]: minutes };
    setReminderDefaults(next);
    await AsyncStorage.setItem(REMINDER_DEFAULTS_KEY, JSON.stringify(next));
  };

  const addSubject = async (subject: string, color: string) => { const next = { ...subjectColors, [subject]: color }; setSubjectColors(next); await AsyncStorage.setItem(SUBJECT_COLORS_KEY, JSON.stringify(next)); };
  const removeSubject = async (subject: string) => { if (Object.keys(DEFAULT_SUBJECT_COLORS).includes(subject)) return; const next = { ...subjectColors }; delete next[subject]; setSubjectColors(next); await AsyncStorage.setItem(SUBJECT_COLORS_KEY, JSON.stringify(next)); };

  const buildTransferPayload = () => {
    const portableEvents = events.map(({ notificationId: _notificationId, ...event }) => event);
    return { format: "school-calendar" as const, version: 1 as const, exportedAt: new Date().toISOString(), events: portableEvents, subjectColors, reminderDefaults };
  };
  const getCloudPayload = () => JSON.stringify(buildTransferPayload());
  const restoreCloudPayload = async (raw: string) => {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error("النسخة السحابية غير صالحة"); }
    if (!isValidTransferData(parsed)) throw new Error("تحتوي النسخة السحابية على بيانات غير صالحة");
    const nextColors = parsed.subjectColors;
    const nextEvents = parsed.events;
    setEvents(nextEvents); setSubjectColors(nextColors); if (parsed.reminderDefaults) setReminderDefaults(parsed.reminderDefaults);
    await persist(nextEvents); await refreshMorningSummaries(nextEvents); await AsyncStorage.setItem(SUBJECT_COLORS_KEY, JSON.stringify(nextColors)); if (parsed.reminderDefaults) await AsyncStorage.setItem(REMINDER_DEFAULTS_KEY, JSON.stringify(parsed.reminderDefaults));
    return { events: nextEvents.length, subjects: Object.keys(nextColors).length };
  };
  const exportData = async () => {
    const payload = buildTransferPayload();
    const uri = `${FileSystem.cacheDirectory}school-calendar-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "تصدير روزنامتي الدراسية" });
  };

  const importData = async (confirmReplacement: () => Promise<boolean>) => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
    if (result.canceled) return { imported: false, message: "تم إلغاء الاستيراد" };
    try {
      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed: unknown = JSON.parse(raw);
      if (!isValidTransferData(parsed)) return { imported: false, message: "يحتوي الملف على موعد أو مادة غير صالحة" };
      const nextColors = parsed.subjectColors;
      const nextEvents = parsed.events;
      if (!(await confirmReplacement())) return { imported: false, message: "تم إلغاء الاستيراد" };
      setEvents(nextEvents); setSubjectColors(nextColors); if (parsed.reminderDefaults) setReminderDefaults(parsed.reminderDefaults);
      await persist(nextEvents); await refreshMorningSummaries(nextEvents); await AsyncStorage.setItem(SUBJECT_COLORS_KEY, JSON.stringify(nextColors)); if (parsed.reminderDefaults) await AsyncStorage.setItem(REMINDER_DEFAULTS_KEY, JSON.stringify(parsed.reminderDefaults));
      return { imported: true, message: `تم استيراد ${nextEvents.length} موعدًا و${Object.keys(nextColors).length} مادة` };
    } catch { return { imported: false, message: "تعذر قراءة ملف الاستيراد" }; }
  };

  const setDailyAlarm = async (enabled: boolean, time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return;
    if (Platform.OS !== "web") {
      const existing = await AsyncStorage.getItem(ALARM_KEY);
      if (existing) { try { await Notifications.cancelScheduledNotificationAsync(existing); } catch {} }
      let notificationId: string | undefined;
      if (enabled) notificationId = await Notifications.scheduleNotificationAsync({ content: { title: "منبه الدراسة", body: "حان وقت المنبه الدراسي" }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute } });
      await AsyncStorage.setItem(ALARM_KEY, notificationId ?? "");
    }
    setAlarmEnabled(enabled); setAlarmTime(time); await AsyncStorage.setItem(ALARM_TIME_KEY, time);
  };
  const previewAlarmSound = async () => {
    if (Platform.OS === "web") return;
    await Notifications.setNotificationChannelAsync("school-calendar-alarm", { name: "منبه الدراسة", importance: Notifications.AndroidImportance.HIGH });
    await Notifications.scheduleNotificationAsync({ content: { title: "تجربة منبه الدراسة", body: "هذه تجربة للصوت المختار من إعدادات Android." }, trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, repeats: false, channelId: "school-calendar-alarm" } });
  };
  const setTimeFormat = async (format: 12 | 24) => { setTimeFormatState(format); await AsyncStorage.setItem(TIME_FORMAT_KEY, String(format)); };

  useEffect(() => {
    if (!hydrated) return;
    if (!autoSyncReady.current) { autoSyncReady.current = true; return; }
    const timer = setTimeout(() => { void createTRPCClient().cloudSync.push.mutate({ payload: getCloudPayload() }).catch(() => undefined); }, 1200);
    return () => clearTimeout(timer);
  }, [hydrated, events, subjectColors, reminderDefaults]);

  const value = useMemo(() => ({ events, hydrated, notificationsEnabled, subjectColors, notificationSounds, reminderDefaults, addEvent, updateEvent, deleteEvent, toggleEvent, requestNotifications, setSubjectColor, setNotificationSound, setReminderDefault, addSubject, removeSubject, exportData, importData, alarmEnabled, alarmTime, setDailyAlarm, previewAlarmSound, timeFormat, setTimeFormat, getCloudPayload, restoreCloudPayload }), [events, hydrated, notificationsEnabled, subjectColors, notificationSounds, reminderDefaults, alarmEnabled, alarmTime, timeFormat]);
  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) throw new Error("useCalendar must be used inside CalendarProvider");
  return context;
}

export const EVENT_META: Record<EventType, { label: string; color: string; soft: string; icon: string }> = {
  lesson: { label: "درس", color: "#2878C8", soft: "#E7F0FB", icon: "menu-book" },
  homework: { label: "واجب", color: "#E26B45", soft: "#FFF0EB", icon: "assignment" },
  exam: { label: "امتحان", color: "#C04A75", soft: "#FCECF2", icon: "edit-note" },
  evaluation: { label: "تقييم", color: "#8559B4", soft: "#F2EBF8", icon: "fact-check" },
  activity: { label: "نشاط", color: "#0F8C7D", soft: "#E5F6F2", icon: "local-activity" },
};

export const WEEK_DAYS = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
export const SHORT_DAYS = ["اث", "ثلا", "أر", "خم", "جم", "سب", "أحد"];
export const ARABIC_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
export const ARABIC_NUMBERS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function arabicNumber(value: number | string) {
  return String(value).replace(/[0-9]/g, (digit) => ARABIC_NUMBERS[Number(digit)]);
}

export function formatArabicDate(date: Date) {
  return `${WEEK_DAYS[(date.getDay() + 6) % 7]}، ${arabicNumber(date.getDate())} ${ARABIC_MONTHS[date.getMonth()]}`;
}

export function formatDayNumber(date: Date) {
  return arabicNumber(date.getDate());
}
