import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { normalizeReminderMinutes, notificationSoundForType } from "@/lib/calendar-utils";
import { createTRPCClient } from "@/lib/trpc";

export type EventType = "lesson" | "homework" | "exam" | "evaluation" | "activity";
export type ExamImportance = "normal" | "important" | "critical";
export type NotificationSound = "homework" | "exam";
export type ReminderDefaults = Record<EventType, number[]>;
export type HomeworkStatus = "not_started" | "in_progress" | "completed" | "needs_review";
type LegacyReminderDefaults = { homework: number; exam: number };

export type CalendarEvent = {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  type: EventType;
  importance?: ExamImportance;
  done: boolean;
  status?: HomeworkStatus;
  reminderMinutes: number;
  reminderMinutesList?: number[];
  notes?: string;
  notificationId?: string;
  notificationIds?: string[];
  repeatWeekly?: boolean;
  archived?: boolean;
};

export type NewEvent = Omit<CalendarEvent, "id" | "done" | "notificationId" | "notificationIds"> & { repeatWeekly?: boolean };

type CalendarContextValue = {
  events: CalendarEvent[];
  hydrated: boolean;
  notificationsEnabled: boolean;
  subjectColors: Record<string, string>;
  subjectReminderPlans: Record<string, number[]>;
  notificationHistory: Array<{ id: string; title: string; body: string; receivedAt: string; eventId?: string }>;
  clearNotificationHistory: () => Promise<void>;
  pendingNotificationEventId?: string;
  clearPendingNotification: () => void;
  notificationSounds: Record<NotificationSound, string>;
  reminderDefaults: ReminderDefaults;
  addEvent: (event: NewEvent) => Promise<void>;
  updateEvent: (id: string, event: NewEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  toggleEvent: (id: string) => Promise<void>;
  setEventArchived: (id: string, archived: boolean) => Promise<void>;
  requestNotifications: () => Promise<boolean>;
  setSubjectColor: (subject: string, color: string) => Promise<void>;
  setNotificationSound: (kind: NotificationSound, sound: string) => Promise<void>;
  setReminderPlan: (kind: EventType, minutes: number[]) => Promise<void>;
  setSubjectReminderPlan: (subject: string, minutes: number[]) => Promise<void>;
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

type TransferData = { format: "school-calendar"; version: 1; exportedAt: string; events: CalendarEvent[]; subjectColors: Record<string, string>; subjectReminderPlans?: Record<string, number[]>; reminderDefaults: ReminderDefaults };

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
    (event.status === undefined || event.status === "not_started" || event.status === "in_progress" || event.status === "completed" || event.status === "needs_review") &&
    (event.reminderMinutesList === undefined || (Array.isArray(event.reminderMinutesList) && event.reminderMinutesList.length <= 8 && event.reminderMinutesList.every((item) => typeof item === "number" && Number.isInteger(item) && item >= 0 && item <= 10080))) &&
    (event.notes === undefined || (typeof event.notes === "string" && event.notes.length <= 10000)) &&
    (event.notificationIds === undefined || (Array.isArray(event.notificationIds) && event.notificationIds.length <= 8 && event.notificationIds.every((item) => typeof item === "string" && item.length <= 200))) &&
    (event.repeatWeekly === undefined || typeof event.repeatWeekly === "boolean") &&
    (event.archived === undefined || typeof event.archived === "boolean") &&
    (event.importance === undefined || event.importance === "normal" || event.importance === "important" || event.importance === "critical");
}

function isValidColorMap(value: unknown): value is Record<string, string> {
  return !!value && typeof value === "object" && Object.keys(value).length <= 200 && Object.entries(value).every(([name, color]) => name.length > 0 && name.length <= 100 && typeof color === "string" && HEX_COLOR.test(color));
}

function isValidReminderDefaults(value: unknown): value is ReminderDefaults | LegacyReminderDefaults {
  if (!value || typeof value !== "object") return false;
  const defaults = value as Record<string, unknown>;
  if (typeof defaults.homework === "number" && typeof defaults.exam === "number") return [defaults.homework, defaults.exam].every((minutes) => Number.isInteger(minutes) && minutes >= 0 && minutes <= 10080);
  return EVENT_TYPES.size === Object.keys(defaults).length && [...EVENT_TYPES].every((type) => Array.isArray(defaults[type]) && (defaults[type] as unknown[]).length <= 8 && (defaults[type] as unknown[]).every((minutes) => typeof minutes === "number" && Number.isInteger(minutes) && minutes >= 0 && minutes <= 10080));
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
const SUBJECT_REMINDER_PLANS_KEY = "school-calendar-subject-reminder-plans-v1";
const NOTIFICATION_HISTORY_KEY = "school-calendar-notification-history-v1";
const ALARM_KEY = "school-calendar-alarm-v1";
const ALARM_IDS_KEY = "school-calendar-alarm-ids-v1";
const ALARM_TIME_KEY = "school-calendar-alarm-time-v1";
const TIME_FORMAT_KEY = "school-calendar-time-format-v1";
const DEFAULT_NOTIFICATION_SOUNDS: Record<NotificationSound, string> = { homework: "homework_soft.wav", exam: "exam_alert.wav" };
const DEFAULT_REMINDER_DEFAULTS: ReminderDefaults = { lesson: [15], homework: [60], exam: [1440, 180, 30], evaluation: [180, 30], activity: [60] };
const DEFAULT_SUBJECT_COLORS: Record<string, string> = {};

function normalizeReminderDefaults(value: unknown): ReminderDefaults {
  if (!isValidReminderDefaults(value)) return DEFAULT_REMINDER_DEFAULTS;
  const defaults = value as Record<string, unknown>;
  if (typeof defaults.homework === "number" && typeof defaults.exam === "number") {
    return { ...DEFAULT_REMINDER_DEFAULTS, homework: defaults.homework > 0 ? [defaults.homework] : [], exam: defaults.exam > 0 ? [defaults.exam] : [] };
  }
  return { ...DEFAULT_REMINDER_DEFAULTS, ...Object.fromEntries([...EVENT_TYPES].map((type) => [type, [...(defaults[type] as number[])]])) } as ReminderDefaults;
}

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
  if (Platform.OS === "web") return [];
  const reminderMinutes = normalizeReminderMinutes(event);
  if (reminderMinutes.length === 0) return [];
  const [hours, minutes] = event.time.split(":").map(Number);
  const eventDate = parseDateKey(event.date);
  eventDate.setHours(hours, minutes, 0, 0);
  const ids: string[] = [];
  for (const minutes of reminderMinutes) {
    const triggerDate = new Date(eventDate.getTime() - minutes * 60_000);
    if (triggerDate.getTime() <= Date.now()) continue;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `تذكير: ${event.title}`,
          body: `لديك ${event.type === "exam" ? "امتحان" : event.type === "homework" ? "واجب" : event.type === "lesson" ? "حصة" : "موعد"} في مادة ${event.subject} بتاريخ ${event.date} الساعة ${event.time}. التذكير قبل ${minutes >= 1440 ? `${minutes / 1440} يوم` : minutes >= 60 ? `${minutes / 60} ساعة` : `${minutes} دقيقة`}`,
          sound: notificationSoundForType(event.type, notificationSounds),
          data: { eventId: event.id, eventType: event.type, reminderMinutes: minutes },
          categoryIdentifier: "event-reminder",
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate, channelId: event.type === "exam" ? "school-calendar-exam" : "school-calendar-homework" },
      });
      ids.push(id);
    } catch {
      // Keep scheduling the remaining reminders if one trigger fails.
    }
  }
  return ids;
}

async function cancelReminders(event?: Pick<CalendarEvent, "notificationId" | "notificationIds">) {
  if (Platform.OS === "web" || !event) return;
  const ids = [...(event.notificationIds ?? []), ...(event.notificationId ? [event.notificationId] : [])];
  await Promise.all(ids.map(async (id) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // The notification may already have fired or been removed by Android.
    }
  }));
}

function withNotificationIds(event: CalendarEvent, ids: string[]): CalendarEvent {
  return { ...event, notificationId: ids[0], notificationIds: ids.length > 0 ? ids : undefined };
}

function withoutNotificationIds(event: CalendarEvent): CalendarEvent {
  const { notificationId: _notificationId, notificationIds: _notificationIds, ...portable } = event;
  return portable;
}

function reminderDefaultsForType(type: EventType, defaults: ReminderDefaults): number[] {
  return defaults[type];
}

function reminderPlanForEvent(event: Pick<CalendarEvent, "type" | "subject" | "importance">, defaults: ReminderDefaults, subjectPlans: Record<string, number[]>) {
  const base = subjectPlans[event.subject] ?? reminderDefaultsForType(event.type, defaults);
  if (event.type !== "exam" || !event.importance || event.importance === "normal") return base;
  const extra = event.importance === "critical" ? [10080, 2880] : [2880];
  return [...new Set([...base, ...extra])].sort((a, b) => b - a);
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [subjectColors, setSubjectColors] = useState<Record<string, string>>(DEFAULT_SUBJECT_COLORS);
  const [notificationSounds, setNotificationSounds] = useState<Record<NotificationSound, string>>(DEFAULT_NOTIFICATION_SOUNDS);
  const [reminderDefaults, setReminderDefaults] = useState<ReminderDefaults>(DEFAULT_REMINDER_DEFAULTS);
  const [subjectReminderPlans, setSubjectReminderPlans] = useState<Record<string, number[]>>({});
  const [notificationHistory, setNotificationHistory] = useState<Array<{ id: string; title: string; body: string; receivedAt: string; eventId?: string }>>([]);
  const [pendingNotificationEventId, setPendingNotificationEventId] = useState<string>();
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmTime, setAlarmTime] = useState("07:00");
  const [timeFormat, setTimeFormatState] = useState<12 | 24>(24);
  const autoSyncReady = useRef(false);

  useEffect(() => {
    void (async () => {
      const [storedEvents, storedNotifications, storedSubjectColors, storedNotificationSounds, storedReminderDefaults, storedSubjectReminderPlans, storedNotificationHistory, storedAlarm, storedAlarmTime, storedTimeFormat] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(NOTIFICATION_KEY),
        AsyncStorage.getItem(SUBJECT_COLORS_KEY),
        AsyncStorage.getItem(NOTIFICATION_SOUNDS_KEY),
        AsyncStorage.getItem(REMINDER_DEFAULTS_KEY),
        AsyncStorage.getItem(SUBJECT_REMINDER_PLANS_KEY),
        AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY),
        AsyncStorage.getItem(ALARM_KEY),
        AsyncStorage.getItem(ALARM_TIME_KEY),
        AsyncStorage.getItem(TIME_FORMAT_KEY),
      ]);
      setEvents(safeStoredJson(storedEvents, seedEvents(), isEventArray));
      setNotificationsEnabled(storedNotifications === "true");
      setSubjectColors(storedSubjectColors ? { ...DEFAULT_SUBJECT_COLORS, ...safeStoredJson(storedSubjectColors, {}, isValidColorMap) } : DEFAULT_SUBJECT_COLORS);
      setNotificationSounds(storedNotificationSounds ? safeStoredJson(storedNotificationSounds, DEFAULT_NOTIFICATION_SOUNDS, isNotificationSounds) : DEFAULT_NOTIFICATION_SOUNDS);
      let parsedReminderDefaults: unknown = null;
      try { parsedReminderDefaults = storedReminderDefaults ? JSON.parse(storedReminderDefaults) : null; } catch { parsedReminderDefaults = null; }
      setReminderDefaults(normalizeReminderDefaults(parsedReminderDefaults));
      try { const parsedPlans = storedSubjectReminderPlans ? JSON.parse(storedSubjectReminderPlans) : {}; setSubjectReminderPlans(parsedPlans && typeof parsedPlans === "object" ? parsedPlans : {}); } catch { setSubjectReminderPlans({}); }
      try { const parsedHistory = storedNotificationHistory ? JSON.parse(storedNotificationHistory) : []; setNotificationHistory(Array.isArray(parsedHistory) ? parsedHistory.slice(0, 100) : []); } catch { setNotificationHistory([]); }
      setAlarmEnabled(storedAlarm === "true"); setAlarmTime(storedAlarmTime ?? "07:00");
      setTimeFormatState(storedTimeFormat === "12" ? 12 : 24);
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: content.title ?? "تنبيه دراسي", body: content.body ?? "", receivedAt: new Date().toISOString(), eventId: typeof content.data?.eventId === "string" ? content.data.eventId : undefined };
      setNotificationHistory((current) => { const next = [item, ...current].slice(0, 100); void AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(next)); return next; });
    });
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as { eventId?: unknown };
      const eventId = typeof data.eventId === "string" ? data.eventId : undefined;
      if (response.actionIdentifier === "SNOOZE_10") {
        void Notifications.scheduleNotificationAsync({ content: { title: "غفوة التنبيه", body: "سيعود تذكير الموعد بعد ١٠ دقائق", data: { eventId }, categoryIdentifier: "event-reminder" }, trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 600, repeats: false } });
      } else if (eventId) {
        setPendingNotificationEventId(eventId);
      }
    };
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response) handleNotificationResponse(response); });
    return () => { subscription.remove(); responseSubscription.remove(); };
  }, []);

  const clearNotificationHistory = async () => { setNotificationHistory([]); await AsyncStorage.removeItem(NOTIFICATION_HISTORY_KEY); };
  const clearPendingNotification = () => setPendingNotificationEventId(undefined);

  const addEvent = async (input: NewEvent) => {
    const instances = input.repeatWeekly ? Array.from({ length: 8 }, (_, index) => ({ ...input, date: toDateKey(addDays(parseDateKey(input.date), index * 7)) })) : [input];
    const created: CalendarEvent[] = [];
    for (const instance of instances) {
      const event: CalendarEvent = { ...instance, reminderMinutesList: instance.reminderMinutesList?.length ? instance.reminderMinutesList : reminderPlanForEvent(instance, reminderDefaults, subjectReminderPlans), id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, done: false };
      const notificationIds = notificationsEnabled ? await scheduleEventReminder(event, notificationSounds) : [];
      created.push(withNotificationIds(event, notificationIds));
    }
    const next = [...events, ...created];
    setEvents(next);
    await persist(next);
  };

  const updateEvent = async (id: string, input: NewEvent) => {
    const current = events.find((event) => event.id === id);
    if (!current) return;
    await cancelReminders(current);
    const draft: CalendarEvent = { ...current, ...input };
    const notificationIds = notificationsEnabled && !draft.done && !draft.archived ? await scheduleEventReminder(draft, notificationSounds) : [];
    const updated = withNotificationIds(draft, notificationIds);
    const next = events.map((event) => (event.id === id ? updated : event));
    setEvents(next);
    await persist(next);
  };

  const deleteEvent = async (id: string) => {
    const current = events.find((event) => event.id === id);
    await cancelReminders(current);
    const next = events.filter((event) => event.id !== id);
    setEvents(next);
    await persist(next);
  };

  const toggleEvent = async (id: string) => {
    const current = events.find((event) => event.id === id);
    if (!current) return;
    const completing = !current.done;
    if (completing) await cancelReminders(current);
    const draft: CalendarEvent = { ...current, done: completing, status: completing ? "completed" : current.status === "completed" ? "in_progress" : current.status };
    const next = events.map((event) => (event.id === id ? withNotificationIds(draft, []) : event));
    if (!completing && notificationsEnabled && !current.archived) {
      next.splice(next.findIndex((event) => event.id === id), 1, withNotificationIds(draft, await scheduleEventReminder(draft, notificationSounds)));
    }
    setEvents(next);
    await persist(next);
  };

  const setEventArchived = async (id: string, archived: boolean) => {
    const current = events.find((event) => event.id === id);
    if (!current) return;
    if (archived) await cancelReminders(current);
    const draft: CalendarEvent = { ...current, archived };
    const next = events.map((event) => event.id === id ? withNotificationIds(draft, []) : event);
    if (!archived && notificationsEnabled && !draft.done) {
      next.splice(next.findIndex((event) => event.id === id), 1, withNotificationIds(draft, await scheduleEventReminder(draft, notificationSounds)));
    }
    setEvents(next);
    await persist(next);
  };

  const requestNotifications = async () => {
    if (Platform.OS === "web") return false;
    if (Platform.OS === "android") {
      await Notifications.setNotificationCategoryAsync("event-reminder", [
        { identifier: "SNOOZE_10", buttonTitle: "غفوة ١٠ دقائق" },
        { identifier: "OPEN_EVENT", buttonTitle: "فتح الموعد" },
      ]);
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
      const refreshed = await Promise.all(events.map(async (event) => {
        await cancelReminders(event);
        return withNotificationIds(event, await scheduleEventReminder(event, notificationSounds));
      }));
      setEvents(refreshed);
      await persist(refreshed);
    } else {
      await Promise.all(events.map((event) => cancelReminders(event)));
      const cleared = events.map((event) => withNotificationIds(event, []));
      setEvents(cleared);
      await persist(cleared);
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

  const setSubjectReminderPlan = async (subject: string, minutes: number[]) => {
    const clean = [...new Set(minutes.filter((value) => Number.isInteger(value) && value >= 0 && value <= 10080))].sort((a, b) => b - a);
    const next = { ...subjectReminderPlans, [subject]: clean };
    setSubjectReminderPlans(next);
    await AsyncStorage.setItem(SUBJECT_REMINDER_PLANS_KEY, JSON.stringify(next));
    if (notificationsEnabled) {
      const refreshed = await Promise.all(events.map(async (event) => {
        if (event.subject !== subject || event.done || event.archived) return event;
        await cancelReminders(event);
        const draft = { ...event, reminderMinutesList: clean, reminderMinutes: clean[0] ?? 0 };
        return withNotificationIds(draft, await scheduleEventReminder(draft, notificationSounds));
      }));
      setEvents(refreshed);
      await persist(refreshed);
    }
  };
  const setReminderPlan = async (kind: EventType, minutes: number[]) => {
    const next = { ...reminderDefaults, [kind]: [...new Set(minutes.filter((value) => Number.isInteger(value) && value >= 0 && value <= 10080))].sort((a, b) => b - a) };
    setReminderDefaults(next);
    await AsyncStorage.setItem(REMINDER_DEFAULTS_KEY, JSON.stringify(next));
  };

  const addSubject = async (subject: string, color: string) => { const next = { ...subjectColors, [subject]: color }; setSubjectColors(next); await AsyncStorage.setItem(SUBJECT_COLORS_KEY, JSON.stringify(next)); };
  const removeSubject = async (subject: string) => { if (Object.keys(DEFAULT_SUBJECT_COLORS).includes(subject)) return; const next = { ...subjectColors }; delete next[subject]; setSubjectColors(next); await AsyncStorage.setItem(SUBJECT_COLORS_KEY, JSON.stringify(next)); };

  const buildTransferPayload = () => {
    const portableEvents = events.map(withoutNotificationIds);
    return { format: "school-calendar" as const, version: 1 as const, exportedAt: new Date().toISOString(), events: portableEvents, subjectColors, subjectReminderPlans, reminderDefaults };
  };
  const getCloudPayload = () => JSON.stringify(buildTransferPayload());
  const restoreCloudPayload = async (raw: string) => {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error("النسخة السحابية غير صالحة"); }
    if (!isValidTransferData(parsed)) throw new Error("تحتوي النسخة السحابية على بيانات غير صالحة");
    const nextColors = parsed.subjectColors;
    const nextSubjectPlans = parsed.subjectReminderPlans ?? {};
    const nextEvents = await Promise.all(parsed.events.map(async (event) => {
      await cancelReminders(event);
      const cleanEvent = withoutNotificationIds(event);
      return withNotificationIds(cleanEvent, notificationsEnabled ? await scheduleEventReminder(cleanEvent, notificationSounds) : []);
    }));
    setEvents(nextEvents); setSubjectColors(nextColors); setSubjectReminderPlans(nextSubjectPlans); if (parsed.reminderDefaults) setReminderDefaults(normalizeReminderDefaults(parsed.reminderDefaults));
    await persist(nextEvents); await AsyncStorage.setItem(SUBJECT_COLORS_KEY, JSON.stringify(nextColors)); await AsyncStorage.setItem(SUBJECT_REMINDER_PLANS_KEY, JSON.stringify(nextSubjectPlans)); if (parsed.reminderDefaults) await AsyncStorage.setItem(REMINDER_DEFAULTS_KEY, JSON.stringify(parsed.reminderDefaults));
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
      const nextSubjectPlans = parsed.subjectReminderPlans ?? {};
      const nextEvents = await Promise.all(parsed.events.map(async (event) => {
        await cancelReminders(event);
        const cleanEvent = withoutNotificationIds(event);
        return withNotificationIds(cleanEvent, notificationsEnabled ? await scheduleEventReminder(cleanEvent, notificationSounds) : []);
      }));
      if (!(await confirmReplacement())) return { imported: false, message: "تم إلغاء الاستيراد" };
      setEvents(nextEvents); setSubjectColors(nextColors); setSubjectReminderPlans(nextSubjectPlans); if (parsed.reminderDefaults) setReminderDefaults(normalizeReminderDefaults(parsed.reminderDefaults));
      await persist(nextEvents); await AsyncStorage.setItem(SUBJECT_COLORS_KEY, JSON.stringify(nextColors)); await AsyncStorage.setItem(SUBJECT_REMINDER_PLANS_KEY, JSON.stringify(nextSubjectPlans)); if (parsed.reminderDefaults) await AsyncStorage.setItem(REMINDER_DEFAULTS_KEY, JSON.stringify(parsed.reminderDefaults));
      return { imported: true, message: `تم استيراد ${nextEvents.length} موعدًا و${Object.keys(nextColors).length} مادة` };
    } catch { return { imported: false, message: "تعذر قراءة ملف الاستيراد" }; }
  };

  const cancelDailySummaries = async () => {
    const stored = await AsyncStorage.getItem(ALARM_IDS_KEY);
    const ids: string[] = stored ? (() => { try { const parsed = JSON.parse(stored); return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []; } catch { return []; } })() : [];
    const legacy = await AsyncStorage.getItem(ALARM_KEY);
    await Promise.all([...ids, ...(legacy ? [legacy] : [])].map(async (id) => { try { await Notifications.cancelScheduledNotificationAsync(id); } catch {} }));
    await AsyncStorage.removeItem(ALARM_IDS_KEY);
    await AsyncStorage.removeItem(ALARM_KEY);
  };
  const scheduleDailySummaries = async (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    if (Platform.OS === "web") return;
    const ids: string[] = [];
    for (let offset = 0; offset < 30; offset += 1) {
      const date = addDays(new Date(), offset);
      date.setHours(hour, minute, 0, 0);
      if (date.getTime() <= Date.now()) continue;
      const dayEvents = events.filter((event) => event.date === toDateKey(date) && !event.archived && !event.done).sort((a, b) => a.time.localeCompare(b.time));
      const body = dayEvents.map((event) => `${event.time} ${event.title} (${event.subject})`).join(" · ") || "لا توجد مواعيد دراسية اليوم";
      try {
        ids.push(await Notifications.scheduleNotificationAsync({ content: { title: "ملخص مواعيد اليوم", body, data: { morningSummary: true, summaryDate: toDateKey(date) } }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: "school-calendar-alarm" } }));
      } catch {}
    }
    await AsyncStorage.setItem(ALARM_IDS_KEY, JSON.stringify(ids));
  };
  const setDailyAlarm = async (enabled: boolean, time: string) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return;
    if (Platform.OS !== "web") {
      await cancelDailySummaries();
      if (enabled) await scheduleDailySummaries(time);
    }
    setAlarmEnabled(enabled); setAlarmTime(time); await AsyncStorage.setItem(ALARM_TIME_KEY, time);
  };
  useEffect(() => {
    if (!hydrated || !alarmEnabled || Platform.OS === "web") return;
    const timer = setTimeout(() => { void cancelDailySummaries().then(() => scheduleDailySummaries(alarmTime)); }, 800);
    return () => clearTimeout(timer);
  }, [hydrated, alarmEnabled, alarmTime, events]);
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
  }, [hydrated, events, subjectColors, subjectReminderPlans, reminderDefaults]);

  const value = useMemo(() => ({ events, hydrated, notificationsEnabled, subjectColors, subjectReminderPlans, notificationHistory, clearNotificationHistory, pendingNotificationEventId, clearPendingNotification, notificationSounds, reminderDefaults, addEvent, updateEvent, deleteEvent, toggleEvent, setEventArchived, requestNotifications, setSubjectColor, setNotificationSound, setReminderPlan, setSubjectReminderPlan, addSubject, removeSubject, exportData, importData, alarmEnabled, alarmTime, setDailyAlarm, previewAlarmSound, timeFormat, setTimeFormat, getCloudPayload, restoreCloudPayload }), [events, hydrated, notificationsEnabled, subjectColors, subjectReminderPlans, notificationHistory, pendingNotificationEventId, notificationSounds, reminderDefaults, alarmEnabled, alarmTime, timeFormat]);
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
