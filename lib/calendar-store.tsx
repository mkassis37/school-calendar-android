import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { notificationSoundForType } from "@/lib/calendar-utils";

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
};

const STORAGE_KEY = "school-calendar-events-v1";
const NOTIFICATION_KEY = "school-calendar-notifications-v1";
const SUBJECT_COLORS_KEY = "school-calendar-subject-colors-v1";
const NOTIFICATION_SOUNDS_KEY = "school-calendar-notification-sounds-v1";
const REMINDER_DEFAULTS_KEY = "school-calendar-reminder-defaults-v1";
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

  useEffect(() => {
    void (async () => {
      const [storedEvents, storedNotifications, storedSubjectColors, storedNotificationSounds, storedReminderDefaults] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(NOTIFICATION_KEY),
        AsyncStorage.getItem(SUBJECT_COLORS_KEY),
        AsyncStorage.getItem(NOTIFICATION_SOUNDS_KEY),
        AsyncStorage.getItem(REMINDER_DEFAULTS_KEY),
      ]);
      setEvents(storedEvents ? JSON.parse(storedEvents) : seedEvents());
      setNotificationsEnabled(storedNotifications === "true");
      setSubjectColors(storedSubjectColors ? { ...DEFAULT_SUBJECT_COLORS, ...JSON.parse(storedSubjectColors) } : DEFAULT_SUBJECT_COLORS);
      setNotificationSounds(storedNotificationSounds ? { ...DEFAULT_NOTIFICATION_SOUNDS, ...JSON.parse(storedNotificationSounds) } : DEFAULT_NOTIFICATION_SOUNDS);
      setReminderDefaults(storedReminderDefaults ? { ...DEFAULT_REMINDER_DEFAULTS, ...JSON.parse(storedReminderDefaults) } : DEFAULT_REMINDER_DEFAULTS);
      setHydrated(true);
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
  };

  const updateEvent = async (id: string, input: NewEvent) => {
    const current = events.find((event) => event.id === id);
    if (!current) return;
    await cancelReminder(current.notificationId);
    const updated: CalendarEvent = { ...current, ...input, notificationId: notificationsEnabled ? await scheduleEventReminder({ ...current, ...input }, notificationSounds) : undefined };
    const next = events.map((event) => (event.id === id ? updated : event));
    setEvents(next);
    await persist(next);
  };

  const deleteEvent = async (id: string) => {
    const current = events.find((event) => event.id === id);
    await cancelReminder(current?.notificationId);
    const next = events.filter((event) => event.id !== id);
    setEvents(next);
    await persist(next);
  };

  const toggleEvent = async (id: string) => {
    const next = events.map((event) => (event.id === id ? { ...event, done: !event.done } : event));
    setEvents(next);
    await persist(next);
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

  const value = useMemo(() => ({ events, hydrated, notificationsEnabled, subjectColors, notificationSounds, reminderDefaults, addEvent, updateEvent, deleteEvent, toggleEvent, requestNotifications, setSubjectColor, setNotificationSound, setReminderDefault, addSubject, removeSubject }), [events, hydrated, notificationsEnabled, subjectColors, notificationSounds, reminderDefaults]);
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
