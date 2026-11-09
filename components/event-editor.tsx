import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  EVENT_META,
  type CalendarEvent,
  type EventAttachment,
  type EventType,
  type ExamPlan,
  type HomeworkStatus,
  type NewEvent,
  type ReminderDefaults,
} from "@/lib/calendar-store";
import { useColors } from "@/hooks/use-colors";

const PALETTE = {
  ink: "#142330",
  muted: "#738291",
  border: "#E7ECF2",
  teal: "#1AA394",
  white: "#FFFFFF",
  canvas: "#F7F9FC",
};

const typeOptions: EventType[] = [
  "lesson",
  "homework",
  "exam",
  "evaluation",
  "activity",
];

export function EventEditor({
  visible,
  event,
  defaultDate,
  onClose,
  onSave,
  reminderDefaults,
  subjectReminderPlans,
  subjectOptions = [],
  subjectUsage = {},
  onAddSubject,
  preferredTimeFormat = 24,
  defaultType,
}: {
  visible: boolean;
  event?: CalendarEvent | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (value: NewEvent) => Promise<void>;
  reminderDefaults?: ReminderDefaults;
  subjectReminderPlans?: Record<string, number[]>;
  subjectOptions?: string[];
  subjectUsage?: Record<string, number>;
  onAddSubject?: (subject: string) => Promise<void>;
  preferredTimeFormat?: 12 | 24;
  defaultType?: EventType;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectMenu, setSubjectMenu] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectSort, setSubjectSort] = useState<"usage" | "alphabetical">(
    "usage",
  );
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("08:00");
  const [type, setType] = useState<EventType>("lesson");
  const [importance, setImportance] = useState<
    "normal" | "important" | "critical"
  >("normal");
  const [status, setStatus] = useState<HomeworkStatus>("not_started");
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [reminderMinutesList, setReminderMinutesList] = useState<number[]>([
    15,
  ]);
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);
  const [examLessons, setExamLessons] = useState("");
  const [examPages, setExamPages] = useState("");
  const [reviewedLessons, setReviewedLessons] = useState("");
  const [reviewedPages, setReviewedPages] = useState("");
  const [gradeScore, setGradeScore] = useState("");
  const [gradeMax, setGradeMax] = useState("100");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [dateMenu, setDateMenu] = useState<"day" | "month" | "year" | null>(
    null,
  );
  const [timeMenu, setTimeMenu] = useState<"hour" | "minute" | null>(null);
  const [clockVisible, setClockVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timeFormat, setTimeFormat] = useState<12 | 24>(24);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [saving, setSaving] = useState(false);
  const availableSubjects = useMemo(() => {
    const query = subjectSearch.trim().toLocaleLowerCase();
    return [...new Set(subjectOptions)]
      .filter((option) => !query || option.toLocaleLowerCase().includes(query))
      .sort((a, b) =>
        subjectSort === "usage"
          ? (subjectUsage[b] ?? 0) - (subjectUsage[a] ?? 0) ||
            a.localeCompare(b, "ar")
          : a.localeCompare(b, "ar"),
      );
  }, [subjectOptions, subjectSearch, subjectSort, subjectUsage]);

  useEffect(() => {
    if (!visible) return;
    setTitle(event?.title ?? "");
    setSubject(event?.subject ?? "");
    setSubjectSearch("");
    setSubjectMenu(false);
    setDate(event?.date ?? defaultDate);
    setTime(event?.time ?? "08:00");
    setTimeFormat(preferredTimeFormat);
    const initialHour = Number((event?.time ?? "08:00").split(":")[0]);
    setPeriod(initialHour >= 12 ? "PM" : "AM");
    setType(event?.type ?? defaultType ?? "lesson");
    setImportance(event?.importance ?? "normal");
    setStatus(event?.status ?? (event?.done ? "completed" : "not_started"));
    const configuredReminders = event?.subject
      ? (subjectReminderPlans?.[event.subject] ??
        reminderDefaults?.[event?.type ?? "lesson"] ?? [15])
      : (reminderDefaults?.[event?.type ?? "lesson"] ?? [15]);
    const defaultReminder =
      event?.reminderMinutes ?? configuredReminders[0] ?? 0;
    const initialReminders =
      event?.reminderMinutesList ??
      (defaultReminder > 0 ? configuredReminders : []);
    setReminderMinutesList(initialReminders);
    setReminderMinutes(String(initialReminders[0] ?? 0));
    setNotes(event?.notes ?? "");
    setAttachments(event?.attachments ?? []);
    setExamLessons(event?.examPlan?.lessons.join(", ") ?? "");
    setExamPages(event?.examPlan?.pages.join(", ") ?? "");
    setReviewedLessons(event?.examPlan?.reviewedLessons.join(", ") ?? "");
    setReviewedPages(event?.examPlan?.reviewedPages.join(", ") ?? "");
    setGradeScore(event?.grade ? String(event.grade.score) : "");
    setGradeMax(event?.grade ? String(event.grade.max) : "100");
    setRepeatWeekly(event?.repeatWeekly ?? false);
  }, [
    visible,
    event,
    defaultDate,
    reminderDefaults,
    subjectReminderPlans,
    preferredTimeFormat,
    defaultType,
  ]);

  const changeType = (next: EventType) => {
    setType(next);
    if (!event) {
      const nextPlan = reminderDefaults?.[next] ?? [15];
      setReminderMinutesList(nextPlan);
      setReminderMinutes(String(nextPlan[0] ?? 0));
    }
  };

  const addSubjectFromPicker = async () => {
    const nextSubject = subjectSearch.trim().slice(0, 100);
    if (
      !nextSubject ||
      !onAddSubject ||
      subjectOptions.some((option) => option === nextSubject)
    )
      return;
    await onAddSubject(nextSubject);
    setSubject(nextSubject);
    setSubjectSearch("");
  };

  const save = async () => {
    if (!title.trim() || !date.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    setSaving(true);
    const splitItems = (value: string) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 100);
    const examPlan: ExamPlan | undefined =
      type === "exam"
        ? {
            lessons: splitItems(examLessons),
            pages: splitItems(examPages),
            reviewedLessons: splitItems(reviewedLessons),
            reviewedPages: splitItems(reviewedPages),
          }
        : undefined;
    const parsedScore = Number(gradeScore);
    const parsedMax = Number(gradeMax);
    const grade =
      type === "exam" &&
      Number.isFinite(parsedScore) &&
      Number.isFinite(parsedMax) &&
      parsedScore >= 0 &&
      parsedMax > 0 &&
      parsedScore <= parsedMax
        ? { score: parsedScore, max: parsedMax }
        : undefined;
    await onSave({
      title: title.trim(),
      subject: subject.trim() || "عام",
      date,
      time: time.match(/^\d{2}:\d{2}$/) ? time : "08:00",
      type,
      importance: type === "exam" ? importance : undefined,
      status: type === "homework" ? status : undefined,
      reminderMinutes: Math.max(0, Number(reminderMinutes) || 0),
      reminderMinutesList,
      notes: notes.trim(),
      attachments,
      examPlan,
      grade,
      repeatWeekly,
    });
    setSaving(false);
  };

  const addAttachments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const directory = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}school-calendar-attachments/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const selected = await Promise.all(
      result.assets.slice(0, 12 - attachments.length).map(async (asset) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const target = `${directory}${id}-${asset.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        try {
          await FileSystem.copyAsync({ from: asset.uri, to: target });
        } catch {}
        return {
          id,
          name: asset.name,
          uri: target,
          mimeType: asset.mimeType ?? "application/octet-stream",
          size: asset.size,
        };
      }),
    );
    setAttachments((current) => [...current, ...selected]);
  };
  const [dateYear, dateMonth, dateDay] = date.split("-").map(Number);
  const daysInMonth = new Date(dateYear || 2026, dateMonth || 1, 0).getDate();
  const years = Array.from(
    { length: 11 },
    (_, index) => new Date().getFullYear() - 5 + index,
  );
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const updateDatePart = (part: "day" | "month" | "year", value: number) => {
    let nextYear = dateYear || new Date().getFullYear();
    let nextMonth = dateMonth || 1;
    let nextDay = dateDay || 1;
    if (part === "year") nextYear = value;
    if (part === "month") nextMonth = value;
    if (part === "day") nextDay = value;
    const maxDay = new Date(nextYear, nextMonth, 0).getDate();
    setDate(
      `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(Math.min(nextDay, maxDay)).padStart(2, "0")}`,
    );
    setDateMenu(null);
  };
  const [timeHour, timeMinute] = time.split(":").map(Number);
  const displayHour = timeFormat === 12 ? timeHour % 12 || 12 : timeHour;
  const hours = Array.from(
    { length: timeFormat === 12 ? 12 : 24 },
    (_, index) => (timeFormat === 12 ? index + 1 : index),
  );
  const minutes = Array.from({ length: 60 }, (_, index) => index);
  const updateTimePart = (part: "hour" | "minute", value: number) => {
    const hour =
      part === "hour"
        ? timeFormat === 12
          ? (value % 12) + (period === "PM" ? 12 : 0)
          : value
        : timeHour || 0;
    const minute = part === "minute" ? value : timeMinute || 0;
    setTime(
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
    setTimeMenu(null);
  };
  const changePeriod = (next: "AM" | "PM") => {
    const hour12 = timeHour % 12;
    const hour = hour12 + (next === "PM" ? 12 : 0);
    setPeriod(next);
    setTime(
      `${String(hour).padStart(2, "0")}:${String(timeMinute || 0).padStart(2, "0")}`,
    );
  };
  const chooseCalendarDate = (year: number, month: number, day: number) => {
    const safeDay = Math.min(day, new Date(year, month, 0).getDate());
    setDate(
      `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`,
    );
    setCalendarVisible(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View
            style={[styles.sheetHeader, { borderBottomColor: colors.border }]}
          >
            <Pressable onPress={onClose} style={styles.iconButton}>
              <IconSymbol name="close" size={22} color={colors.muted} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {event ? "تعديل الموعد" : "إضافة إلى التقويم"}
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>
                احفظه على جهازك ليبقى متاحًا بلا إنترنت
              </Text>
            </View>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
          >
            <FormSection
              title="المعلومات الأساسية"
              icon="assignment"
              color={colors.primary}
            />
            <Text style={[styles.label, { color: colors.foreground }]}>
              العنوان
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="مثال: مراجعة درس الكسور"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              textAlign="right"
              autoFocus
            />

            <Text style={[styles.label, { color: colors.foreground }]}>
              المادة أو التصنيف
            </Text>
            <View style={styles.subjectPickerWrap}>
              <Pressable
                onPress={() =>
                  subjectOptions.length > 0 && setSubjectMenu((value) => !value)
                }
                style={styles.subjectPicker}
              >
                <Text style={styles.subjectPickerText}>
                  {subject ||
                    (subjectOptions.length
                      ? "اختر المادة"
                      : "أدخل المادة يدويًا")}
                </Text>
                <Text style={styles.subjectPickerChevron}>
                  {subjectOptions.length ? (subjectMenu ? "⌃" : "⌄") : ""}
                </Text>
              </Pressable>
              {subjectMenu ? (
                <View style={styles.subjectMenu}>
                  <TextInput
                    value={subjectSearch}
                    onChangeText={setSubjectSearch}
                    placeholder="ابحث عن مادة..."
                    placeholderTextColor="#AAB5BF"
                    style={styles.subjectSearchInput}
                    textAlign="right"
                    returnKeyType="search"
                  />
                  <View style={styles.subjectSortRow}>
                    <Pressable
                      onPress={() => setSubjectSort("usage")}
                      style={[
                        styles.subjectSortPill,
                        subjectSort === "usage" && styles.subjectSortPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.subjectSortText,
                          subjectSort === "usage" &&
                            styles.subjectSortTextActive,
                        ]}
                      >
                        الأكثر استخدامًا
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSubjectSort("alphabetical")}
                      style={[
                        styles.subjectSortPill,
                        subjectSort === "alphabetical" &&
                          styles.subjectSortPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.subjectSortText,
                          subjectSort === "alphabetical" &&
                            styles.subjectSortTextActive,
                        ]}
                      >
                        أبجديًا
                      </Text>
                    </Pressable>
                  </View>
                  <ScrollView
                    style={styles.subjectMenuScroll}
                    contentContainerStyle={styles.subjectMenuContent}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                  >
                    {availableSubjects.map((option) => {
                      const active = option === subject;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => {
                            setSubject(option);
                            setSubjectSearch("");
                            setSubjectMenu(false);
                          }}
                          style={[
                            styles.subjectOption,
                            active && styles.subjectOptionActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.subjectOptionText,
                              active && styles.subjectOptionTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                          {active ? (
                            <IconSymbol
                              name="check"
                              size={16}
                              color={colors.primary}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                    {onAddSubject &&
                    subjectSearch.trim() &&
                    !subjectOptions.some(
                      (option) => option === subjectSearch.trim(),
                    ) ? (
                      <Pressable
                        onPress={() => void addSubjectFromPicker()}
                        style={styles.addSubjectOption}
                      >
                        <Text style={styles.addSubjectOptionText}>
                          إضافة «{subjectSearch.trim()}» كمادة جديدة
                        </Text>
                        <IconSymbol
                          name="add"
                          size={16}
                          color={colors.primary}
                        />
                      </Pressable>
                    ) : null}
                    {availableSubjects.length === 0 && !subjectSearch.trim() ? (
                      <Text style={styles.subjectEmptyText}>
                        لا توجد مواد بعد
                      </Text>
                    ) : null}
                  </ScrollView>
                </View>
              ) : null}
              {subjectOptions.length === 0 ? (
                <TextInput
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="مثال: رياضيات"
                  placeholderTextColor="#AAB5BF"
                  style={[styles.input, { marginTop: 7 }]}
                  textAlign="right"
                />
              ) : null}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>
              النوع
            </Text>
            <View style={styles.typeGrid}>
              {typeOptions.map((option) => {
                const meta = EVENT_META[option];
                const active = type === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => changeType(option)}
                    style={[
                      styles.typePill,
                      active && {
                        borderColor: meta.color,
                        backgroundColor: meta.soft,
                      },
                    ]}
                  >
                    <IconSymbol
                      name={meta.icon as never}
                      size={18}
                      color={active ? meta.color : colors.muted}
                    />
                    <Text
                      style={[styles.typeText, active && { color: meta.color }]}
                    >
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {type === "exam" ? (
              <>
                <Text style={styles.label}>أهمية الامتحان</Text>
                <View style={styles.typeGrid}>
                  {(["normal", "important", "critical"] as const).map(
                    (level) => (
                      <Pressable
                        key={level}
                        onPress={() => setImportance(level)}
                        style={[
                          styles.typePill,
                          importance === level && styles.examImportanceActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeText,
                            importance === level && styles.formatTextActive,
                          ]}
                        >
                          {level === "normal"
                            ? "عادي"
                            : level === "important"
                              ? "مهم"
                              : "حرج"}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </>
            ) : null}
            {type === "homework" ? (
              <>
                <Text style={styles.label}>حالة الواجب</Text>
                <View style={styles.typeGrid}>
                  {(
                    [
                      ["not_started", "لم يبدأ"],
                      ["in_progress", "قيد الإنجاز"],
                      ["completed", "تم الإنجاز"],
                      ["needs_review", "يحتاج مراجعة"],
                    ] as const
                  ).map(([value, label]) => (
                    <Pressable
                      key={value}
                      onPress={() => setStatus(value)}
                      style={[
                        styles.typePill,
                        status === value && styles.examImportanceActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          status === value && styles.formatTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
            <FormSection
              title="التفاصيل"
              icon="calendar"
              color={colors.primary}
            />
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>الوقت</Text>
                <View style={styles.formatRow}>
                  <Pressable
                    onPress={() => setTimeFormat(24)}
                    style={[
                      styles.formatPill,
                      timeFormat === 24 && styles.formatPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.formatText,
                        timeFormat === 24 && styles.formatTextActive,
                      ]}
                    >
                      24 ساعة
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setTimeFormat(12)}
                    style={[
                      styles.formatPill,
                      timeFormat === 12 && styles.formatPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.formatText,
                        timeFormat === 12 && styles.formatTextActive,
                      ]}
                    >
                      12 ساعة
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => setClockVisible(true)}
                  style={styles.clockOpenButton}
                >
                  <Text style={styles.timePickerValue}>
                    {timeFormat === 12
                      ? `${displayHour}:${String(timeMinute).padStart(2, "0")} ${period === "AM" ? "ص" : "م"}`
                      : `${String(timeHour).padStart(2, "0")}:${String(timeMinute).padStart(2, "0")}`}
                  </Text>
                  <Text style={styles.timePickerLabel}>
                    فتح الساعة التناظرية
                  </Text>
                </Pressable>
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>التاريخ</Text>
                <Pressable
                  onPress={() => setCalendarVisible(true)}
                  style={styles.calendarOpenButton}
                >
                  <Text style={styles.datePickerValue}>
                    {dateDay} / {dateMonth} / {dateYear}
                  </Text>
                  <Text style={styles.datePickerLabel}>
                    فتح الرزنامة لاختيار اليوم
                  </Text>
                </Pressable>
              </View>
            </View>

            <FormSection
              title="التنبيهات"
              icon="notificationsActive"
              color={colors.primary}
            />
            <Text style={[styles.label, { color: colors.foreground }]}>
              وقت التذكير
            </Text>
            <Text style={styles.reminderHint}>
              {event
                ? "يمكنك تعديل خطة التنبيه لهذا الموعد الآن"
                : "يمكنك اختيار أكثر من وقت للتنبيه لنفس الموعد"}
            </Text>
            <View style={styles.reminderRow}>
              {[0, 15, 30, 60, 180, 1440, 10080].map((value) => {
                const active =
                  value === 0
                    ? reminderMinutesList.length === 0
                    : reminderMinutesList.includes(value);
                const toggle = () => {
                  if (value === 0) {
                    setReminderMinutesList([]);
                    setReminderMinutes("0");
                    return;
                  }
                  const next = reminderMinutesList.includes(value)
                    ? reminderMinutesList.filter((item) => item !== value)
                    : [...reminderMinutesList, value].sort((a, b) => b - a);
                  setReminderMinutesList(next);
                  setReminderMinutes(String(next[0] ?? 0));
                };
                return (
                  <Pressable
                    key={value}
                    onPress={toggle}
                    style={[
                      styles.reminderPill,
                      active && styles.reminderPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderText,
                        active && styles.reminderTextActive,
                      ]}
                    >
                      {value === 0
                        ? "بدون"
                        : value === 10080
                          ? "أسبوع"
                          : value === 1440
                            ? "يوم"
                            : value === 180
                              ? "3 ساعات"
                              : `${value} د`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setRepeatWeekly((value) => !value)}
              style={styles.repeatRow}
            >
              <View
                style={[
                  styles.repeatCheck,
                  repeatWeekly && styles.repeatCheckActive,
                ]}
              >
                {repeatWeekly && (
                  <IconSymbol name="check" size={14} color={colors.surface} />
                )}
              </View>
              <View style={styles.repeatCopy}>
                <Text style={styles.repeatTitle}>تكرار الحصة أسبوعيًا</Text>
                <Text style={styles.repeatSubtitle}>
                  ينشئ الموعد للأسبوع الحالي والأسابيع السبعة القادمة
                </Text>
              </View>
            </Pressable>

            <Text style={[styles.label, { color: colors.foreground }]}>
              الوصف (اختياري)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="أضف أي تفاصيل تساعدك"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                styles.notes,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              textAlign="right"
              multiline
            />
            {type === "exam" ? (
              <View style={styles.planBox}>
                <Text style={styles.planTitle}>خطة الاستعداد للامتحان</Text>
                <Text style={styles.planHint}>
                  اكتب العناصر مفصولة بفواصل، ثم حدد ما تمت مراجعته.
                </Text>
                <TextInput
                  value={examLessons}
                  onChangeText={setExamLessons}
                  placeholder="الدروس: الكسور، المعادلات"
                  placeholderTextColor="#AAB5BF"
                  style={styles.input}
                  textAlign="right"
                />
                <TextInput
                  value={examPages}
                  onChangeText={setExamPages}
                  placeholder="الصفحات: 12-18، 24"
                  placeholderTextColor="#AAB5BF"
                  style={styles.input}
                  textAlign="right"
                />
                <TextInput
                  value={reviewedLessons}
                  onChangeText={setReviewedLessons}
                  placeholder="الدروس المراجعة"
                  placeholderTextColor="#AAB5BF"
                  style={styles.input}
                  textAlign="right"
                />
                <TextInput
                  value={reviewedPages}
                  onChangeText={setReviewedPages}
                  placeholder="الصفحات المراجعة"
                  placeholderTextColor="#AAB5BF"
                  style={styles.input}
                  textAlign="right"
                />
                <View style={styles.gradeRow}>
                  <TextInput
                    value={gradeMax}
                    onChangeText={setGradeMax}
                    placeholder="من"
                    keyboardType="numeric"
                    placeholderTextColor="#AAB5BF"
                    style={styles.gradeInput}
                    textAlign="center"
                  />
                  <Text style={styles.gradeSlash}>/</Text>
                  <TextInput
                    value={gradeScore}
                    onChangeText={setGradeScore}
                    placeholder="العلامة"
                    keyboardType="numeric"
                    placeholderTextColor="#AAB5BF"
                    style={styles.gradeInput}
                    textAlign="center"
                  />
                </View>
                <Text style={styles.planHint}>
                  العلامة اختيارية وتظهر في التقرير الأسبوعي.
                </Text>
              </View>
            ) : null}
            {type === "homework" || type === "exam" ? (
              <View style={styles.attachmentBox}>
                <View style={styles.attachmentHeader}>
                  <Text style={styles.planTitle}>المرفقات</Text>
                  <Pressable
                    onPress={() => void addAttachments()}
                    style={styles.attachButton}
                  >
                    <IconSymbol name="add" size={15} color={colors.primary} />
                    <Text style={styles.attachText}>إضافة صورة أو PDF</Text>
                  </Pressable>
                </View>
                {attachments.map((attachment) => (
                  <View key={attachment.id} style={styles.attachmentRow}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setAttachments((current) =>
                          current.filter((item) => item.id !== attachment.id),
                        )
                      }
                    >
                      <Text style={styles.removeAttachment}>حذف</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={save}
              disabled={saving || !title.trim()}
              style={({ pressed }) => [
                styles.saveButton,
                (!title.trim() || saving) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol name="check" size={20} color={colors.surface} />
              <Text style={styles.saveText}>
                {saving
                  ? "جارٍ الحفظ..."
                  : event
                    ? "حفظ التعديلات"
                    : "إضافة للروزنامة"}
              </Text>
            </Pressable>
          </ScrollView>
          <ClockPicker
            visible={clockVisible}
            time={time}
            format={timeFormat}
            period={period}
            onSelect={updateTimePart}
            onPeriodChange={changePeriod}
            onClose={() => setClockVisible(false)}
          />
          <CalendarPicker
            visible={calendarVisible}
            year={dateYear}
            month={dateMonth}
            day={dateDay}
            onSelect={chooseCalendarDate}
            onClose={() => setCalendarVisible(false)}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ClockPicker({
  visible,
  time,
  format,
  period,
  onSelect,
  onPeriodChange,
  onClose,
}: {
  visible: boolean;
  time: string;
  format: 12 | 24;
  period: "AM" | "PM";
  onSelect: (part: "hour" | "minute", value: number) => void;
  onPeriodChange: (period: "AM" | "PM") => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [hour, minute] = time.split(":").map(Number);
  const values =
    mode === "hour"
      ? format === 12
        ? Array.from({ length: 12 }, (_, i) => i + 1)
        : Array.from({ length: 24 }, (_, i) => i)
      : Array.from({ length: 12 }, (_, i) => i * 5);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.clockOverlay}>
        <View style={styles.clockCard}>
          <Text style={styles.clockTitle}>اختيار الوقت</Text>
          <Text style={styles.clockValue}>
            {format === 12
              ? `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period === "AM" ? "صباحًا" : "مساءً"}`
              : `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
          </Text>
          <View style={styles.clockModeRow}>
            <Pressable
              onPress={() => setMode("hour")}
              style={[
                styles.clockMode,
                mode === "hour" && styles.clockModeActive,
              ]}
            >
              <Text style={styles.clockModeText}>الساعة</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("minute")}
              style={[
                styles.clockMode,
                mode === "minute" && styles.clockModeActive,
              ]}
            >
              <Text style={styles.clockModeText}>الدقائق</Text>
            </Pressable>
          </View>
          <View style={styles.clockFace}>
            {values.map((value, index) => {
              const angle = (index / values.length) * Math.PI * 2 - Math.PI / 2;
              const left = 112 + Math.cos(angle) * 78 - 19;
              const top = 112 + Math.sin(angle) * 78 - 19;
              const selected =
                mode === "hour"
                  ? format === 12
                    ? value === (hour % 12 || 12)
                    : value === hour
                  : value === minute;
              return (
                <Pressable
                  key={value}
                  onPress={() => onSelect(mode, value)}
                  style={[
                    styles.clockMark,
                    { left, top },
                    selected && styles.clockMarkActive,
                  ]}
                >
                  <Text style={styles.clockMarkText}>
                    {String(value).padStart(2, "0")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {format === 12 && (
            <View style={styles.clockPeriodRow}>
              <Pressable
                onPress={() => onPeriodChange("AM")}
                style={[
                  styles.periodPill,
                  period === "AM" && styles.formatPillActive,
                ]}
              >
                <Text style={styles.formatText}>صباحًا</Text>
              </Pressable>
              <Pressable
                onPress={() => onPeriodChange("PM")}
                style={[
                  styles.periodPill,
                  period === "PM" && styles.formatPillActive,
                ]}
              >
                <Text style={styles.formatText}>مساءً</Text>
              </Pressable>
            </View>
          )}
          <Pressable onPress={onClose} style={styles.clockDone}>
            <Text style={styles.clockDoneText}>تم</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function CalendarPicker({
  visible,
  year,
  month,
  day,
  onSelect,
  onClose,
}: {
  visible: boolean;
  year: number;
  month: number;
  day: number;
  onSelect: (year: number, month: number, day: number) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month);
  useEffect(() => {
    if (visible) {
      setViewYear(year);
      setViewMonth(month);
    }
  }, [visible, year, month]);
  const shiftMonth = (amount: number) => {
    const next = new Date(viewYear, viewMonth - 1 + amount, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth() + 1);
  };
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const total = new Date(viewYear, viewMonth, 0).getDate();
  const cells = Array.from({ length: firstDay + total }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1,
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.clockOverlay}>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.clockTitle}>اختيار اليوم</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>إغلاق</Text>
            </Pressable>
          </View>
          <View style={styles.calendarNav}>
            <Pressable
              onPress={() => shiftMonth(-1)}
              style={styles.calendarNavButton}
            >
              <Text style={styles.calendarNavText}>السابق</Text>
            </Pressable>
            <Text style={styles.calendarMonth}>
              {viewYear} / {String(viewMonth).padStart(2, "0")}
            </Text>
            <Pressable
              onPress={() => shiftMonth(1)}
              style={styles.calendarNavButton}
            >
              <Text style={styles.calendarNavText}>التالي</Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {["أحد", "اثن", "ثلث", "أرب", "خمي", "جمع", "سبت"].map((name) => (
              <Text key={name} style={styles.weekText}>
                {name}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {cells.map((value, index) =>
              value === null ? (
                <View key={`empty-${index}`} style={styles.calendarCell} />
              ) : (
                <Pressable
                  key={value}
                  onPress={() => onSelect(viewYear, viewMonth, value)}
                  style={[
                    styles.calendarCell,
                    value === day &&
                      viewMonth === month &&
                      viewYear === year &&
                      styles.calendarDayActive,
                  ]}
                >
                  <Text style={styles.calendarDayText}>{value}</Text>
                </Pressable>
              ),
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FormSection({
  title,
  icon,
  color,
}: {
  title: string;
  icon: "assignment" | "calendar" | "notificationsActive";
  color: string;
}) {
  return (
    <View style={sectionStyles.row}>
      <View style={[sectionStyles.icon, { backgroundColor: `${color}18` }]}>
        <IconSymbol name={icon} size={16} color={color} />
      </View>
      <Text style={[sectionStyles.title, { color }]}>{title}</Text>
      <View style={[sectionStyles.line, { backgroundColor: `${color}35` }]} />
    </View>
  );
}
const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 2,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#1AA394",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  line: { flex: 1, height: 1, backgroundColor: "#E7ECF2" },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(20,35,48,0.36)",
  },
  sheet: {
    maxHeight: "92%",
    backgroundColor: PALETTE.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PALETTE.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, alignItems: "flex-end", marginRight: 12 },
  sheetTitle: {
    color: PALETTE.ink,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "right",
  },
  sheetSubtitle: {
    color: PALETTE.muted,
    fontSize: 12,
    marginTop: 3,
    textAlign: "right",
  },
  content: { padding: 20, paddingBottom: 34 },
  label: {
    color: PALETTE.ink,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 7,
    textAlign: "right",
  },
  subjectPickerWrap: { position: "relative", zIndex: 20 },
  subjectPicker: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FBFCFE",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subjectPickerText: {
    color: PALETTE.ink,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  subjectPickerChevron: {
    color: PALETTE.teal,
    fontSize: 16,
    fontWeight: "900",
  },
  subjectMenu: {
    position: "absolute",
    top: 53,
    left: 0,
    right: 0,
    maxHeight: 300,
    backgroundColor: PALETTE.white,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 12,
    elevation: 8,
    zIndex: 30,
    overflow: "hidden",
  },
  subjectSearchInput: {
    height: 42,
    margin: 8,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    color: PALETTE.ink,
    fontSize: 13,
    backgroundColor: "#FBFCFE",
  },
  subjectSortRow: {
    flexDirection: "row-reverse",
    gap: 6,
    paddingHorizontal: 8,
    paddingBottom: 7,
  },
  subjectSortPill: {
    flex: 1,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 9,
    alignItems: "center",
  },
  subjectSortPillActive: {
    backgroundColor: "#E5F6F2",
    borderColor: PALETTE.teal,
  },
  subjectSortText: { color: PALETTE.muted, fontSize: 10, fontWeight: "800" },
  subjectSortTextActive: { color: PALETTE.teal },
  subjectMenuScroll: { maxHeight: 218 },
  subjectMenuContent: { paddingVertical: 2 },
  subjectOption: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F3F5",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subjectOptionActive: { backgroundColor: "#E5F6F2" },
  subjectOptionText: {
    color: PALETTE.ink,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  subjectOptionTextActive: { color: PALETTE.teal },
  addSubjectOption: {
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F1FAF8",
  },
  addSubjectOptionText: {
    color: PALETTE.teal,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  subjectEmptyText: {
    color: PALETTE.muted,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 16,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: PALETTE.ink,
    fontSize: 15,
    backgroundColor: "#FBFCFE",
  },
  notes: { minHeight: 82, paddingTop: 12, textAlignVertical: "top" },
  planBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFF8E8",
    borderWidth: 1,
    borderColor: "#F2D99A",
    gap: 7,
  },
  planTitle: {
    color: PALETTE.ink,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
  planHint: {
    color: PALETTE.muted,
    fontSize: 10,
    lineHeight: 17,
    textAlign: "right",
  },
  gradeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  gradeInput: {
    width: 82,
    minHeight: 42,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 11,
    color: PALETTE.ink,
    backgroundColor: PALETTE.white,
    fontSize: 15,
    fontWeight: "800",
  },
  gradeSlash: { color: PALETTE.muted, fontSize: 18, fontWeight: "800" },
  attachmentBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#E5F6F2",
    gap: 8,
  },
  attachmentHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attachButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: PALETTE.white,
  },
  attachText: { color: PALETTE.teal, fontSize: 10, fontWeight: "800" },
  attachmentRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#CDEBE5",
  },
  attachmentName: {
    flex: 1,
    color: PALETTE.ink,
    fontSize: 10,
    textAlign: "right",
    marginLeft: 8,
  },
  removeAttachment: { color: "#C04A75", fontSize: 10, fontWeight: "800" },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  examImportanceActive: { backgroundColor: "#FCECF2", borderColor: "#C04A75" },
  typePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  typeText: { color: PALETTE.muted, fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row-reverse", gap: 10 },
  half: { flex: 1 },
  datePickers: { flexDirection: "row-reverse", gap: 5 },
  datePickerWrap: { flex: 1, position: "relative", zIndex: 2 },
  datePicker: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 12,
    backgroundColor: "#FBFCFE",
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerValue: { color: PALETTE.ink, fontSize: 15, fontWeight: "800" },
  datePickerLabel: { color: PALETTE.muted, fontSize: 9, marginTop: 2 },
  dropdown: {
    position: "absolute",
    top: 51,
    left: 0,
    right: 0,
    maxHeight: 170,
    backgroundColor: PALETTE.white,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    zIndex: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  dropdownOption: {
    minHeight: 40,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F3F5",
  },
  dropdownText: { color: PALETTE.ink, fontSize: 13, fontWeight: "700" },
  clockOpenButton: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: PALETTE.teal,
    borderRadius: 12,
    backgroundColor: "#E5F6F2",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarOpenButton: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: PALETTE.teal,
    borderRadius: 12,
    backgroundColor: "#E5F6F2",
    alignItems: "center",
    justifyContent: "center",
  },
  clockOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(20,35,48,0.42)",
  },
  clockCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: PALETTE.white,
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
  },
  clockTitle: {
    color: PALETTE.ink,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
  },
  clockValue: {
    color: PALETTE.teal,
    fontSize: 25,
    fontWeight: "900",
    marginVertical: 8,
  },
  clockModeRow: { flexDirection: "row-reverse", gap: 8, width: "100%" },
  clockMode: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    alignItems: "center",
  },
  clockModeActive: { backgroundColor: "#E5F6F2", borderColor: PALETTE.teal },
  clockModeText: { color: PALETTE.ink, fontSize: 11, fontWeight: "800" },
  clockFace: {
    width: 224,
    height: 224,
    borderRadius: 112,
    backgroundColor: "#F5F9FA",
    marginVertical: 14,
    position: "relative",
    borderWidth: 2,
    borderColor: "#D9EEEA",
  },
  clockMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  clockMarkActive: { backgroundColor: PALETTE.teal },
  clockMarkText: { color: PALETTE.ink, fontSize: 11, fontWeight: "900" },
  clockPeriodRow: { flexDirection: "row-reverse", gap: 8, width: "100%" },
  clockDone: {
    marginTop: 12,
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: PALETTE.teal,
    alignItems: "center",
  },
  clockDoneText: { color: PALETTE.white, fontWeight: "900" },
  calendarCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: PALETTE.white,
    borderRadius: 24,
    padding: 18,
  },
  calendarHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeText: { color: PALETTE.teal, fontSize: 12, fontWeight: "800" },
  calendarNav: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  calendarNavButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#E5F6F2",
  },
  calendarNavText: { color: PALETTE.teal, fontSize: 10, fontWeight: "800" },
  calendarMonth: {
    color: PALETTE.muted,
    textAlign: "center",
    fontWeight: "800",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekText: {
    width: "14.28%",
    textAlign: "center",
    color: PALETTE.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  calendarDayActive: { backgroundColor: PALETTE.teal },
  calendarDayText: { color: PALETTE.ink, fontSize: 13, fontWeight: "800" },
  timePickers: { flexDirection: "row-reverse", gap: 7 },
  timePickerWrap: { flex: 1, position: "relative", zIndex: 3 },
  timePicker: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 12,
    backgroundColor: "#FBFCFE",
    alignItems: "center",
    justifyContent: "center",
  },
  timePickerValue: { color: PALETTE.ink, fontSize: 15, fontWeight: "800" },
  timePickerLabel: { color: PALETTE.muted, fontSize: 9, marginTop: 2 },
  formatRow: { flexDirection: "row-reverse", gap: 6, marginBottom: 6 },
  formatPill: {
    flex: 1,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 9,
    alignItems: "center",
  },
  formatPillActive: { backgroundColor: "#E5F6F2", borderColor: PALETTE.teal },
  formatText: { color: PALETTE.muted, fontSize: 10, fontWeight: "800" },
  formatTextActive: { color: PALETTE.teal },
  periodWrap: { width: 76, gap: 5 },
  periodPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  reminderHint: {
    color: PALETTE.muted,
    fontSize: 10,
    textAlign: "right",
    marginBottom: 8,
  },
  reminderRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  reminderPill: {
    minWidth: 67,
    height: 38,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  reminderPillActive: { backgroundColor: "#E5F6F2", borderColor: PALETTE.teal },
  reminderText: { color: PALETTE.muted, fontSize: 12, fontWeight: "700" },
  reminderTextActive: { color: PALETTE.teal },
  repeatRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F1FAF8",
    borderWidth: 1,
    borderColor: "#D6F0EB",
  },
  repeatCheck: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#B8C8CC",
    alignItems: "center",
    justifyContent: "center",
  },
  repeatCheckActive: {
    backgroundColor: PALETTE.teal,
    borderColor: PALETTE.teal,
  },
  repeatCopy: { flex: 1, alignItems: "flex-end" },
  repeatTitle: {
    color: PALETTE.ink,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  repeatSubtitle: {
    color: PALETTE.muted,
    fontSize: 10,
    marginTop: 3,
    textAlign: "right",
  },
  saveButton: {
    marginTop: 24,
    height: 54,
    borderRadius: 17,
    backgroundColor: PALETTE.teal,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  saveText: { color: PALETTE.white, fontSize: 15, fontWeight: "800" },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  disabled: { opacity: 0.45 },
});
