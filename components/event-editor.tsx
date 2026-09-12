import { useEffect, useState } from "react";
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
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EVENT_META, type CalendarEvent, type EventType, type NewEvent, type ReminderDefaults } from "@/lib/calendar-store";

const PALETTE = {
  ink: "#142330",
  muted: "#738291",
  border: "#E7ECF2",
  teal: "#1AA394",
  white: "#FFFFFF",
  canvas: "#F7F9FC",
};

const typeOptions: EventType[] = ["lesson", "homework", "exam", "evaluation", "activity"];

export function EventEditor({
  visible,
  event,
  defaultDate,
  onClose,
  onSave,
  reminderDefaults,
  preferredTimeFormat = 24,
}: {
  visible: boolean;
  event?: CalendarEvent | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (value: NewEvent) => Promise<void>;
  reminderDefaults?: ReminderDefaults;
  preferredTimeFormat?: 12 | 24;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("08:00");
  const [type, setType] = useState<EventType>("lesson");
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [notes, setNotes] = useState("");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [dateMenu, setDateMenu] = useState<"day" | "month" | "year" | null>(null);
  const [timeMenu, setTimeMenu] = useState<"hour" | "minute" | null>(null);
  const [timeFormat, setTimeFormat] = useState<12 | 24>(24);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(event?.title ?? "");
    setSubject(event?.subject ?? "");
    setDate(event?.date ?? defaultDate);
    setTime(event?.time ?? "08:00");
    setTimeFormat(preferredTimeFormat);
    const initialHour = Number((event?.time ?? "08:00").split(":")[0]); setPeriod(initialHour >= 12 ? "PM" : "AM");
    setType(event?.type ?? "lesson");
    setReminderMinutes(String(event?.reminderMinutes ?? (event?.type === "exam" ? reminderDefaults?.exam : event?.type === "homework" ? reminderDefaults?.homework : 15)));
    setNotes(event?.notes ?? "");
    setRepeatWeekly(event?.repeatWeekly ?? false);
  }, [visible, event, defaultDate, reminderDefaults, preferredTimeFormat]);

  const save = async () => {
    if (!title.trim() || !date.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      subject: subject.trim() || "عام",
      date,
      time: time.match(/^\d{2}:\d{2}$/) ? time : "08:00",
      type,
      reminderMinutes: Math.max(0, Number(reminderMinutes) || 0),
      notes: notes.trim(),
      repeatWeekly,
    });
    setSaving(false);
  };

  const [dateYear, dateMonth, dateDay] = date.split("-").map(Number);
  const daysInMonth = new Date(dateYear || 2026, (dateMonth || 1), 0).getDate();
  const years = Array.from({ length: 11 }, (_, index) => (new Date().getFullYear() - 5 + index));
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const updateDatePart = (part: "day" | "month" | "year", value: number) => {
    let nextYear = dateYear || new Date().getFullYear(); let nextMonth = dateMonth || 1; let nextDay = dateDay || 1;
    if (part === "year") nextYear = value; if (part === "month") nextMonth = value; if (part === "day") nextDay = value;
    const maxDay = new Date(nextYear, nextMonth, 0).getDate();
    setDate(`${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(Math.min(nextDay, maxDay)).padStart(2, "0")}`); setDateMenu(null);
  };
  const [timeHour, timeMinute] = time.split(":").map(Number);
  const displayHour = timeFormat === 12 ? (timeHour % 12 || 12) : timeHour;
  const hours = Array.from({ length: timeFormat === 12 ? 12 : 24 }, (_, index) => timeFormat === 12 ? index + 1 : index);
  const minutes = Array.from({ length: 60 }, (_, index) => index);
  const updateTimePart = (part: "hour" | "minute", value: number) => {
    const hour = part === "hour" ? (timeFormat === 12 ? (value % 12) + (period === "PM" ? 12 : 0) : value) : (timeHour || 0); const minute = part === "minute" ? value : (timeMinute || 0);
    setTime(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`); setTimeMenu(null);
  };
  const changePeriod = (next: "AM" | "PM") => { const hour12 = timeHour % 12; const hour = hour12 + (next === "PM" ? 12 : 0); setPeriod(next); setTime(`${String(hour).padStart(2, "0")}:${String(timeMinute || 0).padStart(2, "0")}`); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} style={styles.iconButton}>
              <IconSymbol name="close" size={22} color={PALETTE.muted} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.sheetTitle}>{event ? "تعديل الموعد" : "إضافة إلى التقويم"}</Text>
              <Text style={styles.sheetSubtitle}>احفظه على جهازك ليبقى متاحًا بلا إنترنت</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
            <Text style={styles.label}>العنوان</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="مثال: مراجعة درس الكسور" placeholderTextColor="#AAB5BF" style={styles.input} textAlign="right" autoFocus />

            <Text style={styles.label}>المادة أو التصنيف</Text>
            <TextInput value={subject} onChangeText={setSubject} placeholder="مثال: رياضيات" placeholderTextColor="#AAB5BF" style={styles.input} textAlign="right" />

            <Text style={styles.label}>النوع</Text>
            <View style={styles.typeGrid}>
              {typeOptions.map((option) => {
                const meta = EVENT_META[option];
                const active = type === option;
                return (
                  <Pressable key={option} onPress={() => setType(option)} style={[styles.typePill, active && { borderColor: meta.color, backgroundColor: meta.soft }]}>
                    <IconSymbol name={meta.icon as never} size={18} color={active ? meta.color : PALETTE.muted} />
                    <Text style={[styles.typeText, active && { color: meta.color }]}>{meta.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>الوقت</Text>
                <View style={styles.formatRow}><Pressable onPress={() => setTimeFormat(24)} style={[styles.formatPill, timeFormat === 24 && styles.formatPillActive]}><Text style={[styles.formatText, timeFormat === 24 && styles.formatTextActive]}>24 ساعة</Text></Pressable><Pressable onPress={() => setTimeFormat(12)} style={[styles.formatPill, timeFormat === 12 && styles.formatPillActive]}><Text style={[styles.formatText, timeFormat === 12 && styles.formatTextActive]}>12 ساعة</Text></Pressable></View><View style={styles.timePickers}>{([["hour", "الساعة", displayHour, hours], ["minute", "الدقائق", timeMinute, minutes]] as const).map(([part, label, value, options]) => <View key={part} style={styles.timePickerWrap}><Pressable onPress={() => setTimeMenu(timeMenu === part ? null : part)} style={styles.timePicker}><Text style={styles.timePickerValue}>{String(value || 0).padStart(2, "0")}</Text><Text style={styles.timePickerLabel}>{label}</Text></Pressable>{timeMenu === part && <View style={styles.dropdown}><ScrollView nestedScrollEnabled showsVerticalScrollIndicator>{options.map((option) => <Pressable key={option} onPress={() => updateTimePart(part, option)} style={styles.dropdownOption}><Text style={styles.dropdownText}>{String(option).padStart(2, "0")}</Text></Pressable>)}</ScrollView></View>}</View>)}{timeFormat === 12 && <View style={styles.periodWrap}><Pressable onPress={() => changePeriod("AM")} style={[styles.periodPill, period === "AM" && styles.formatPillActive]}><Text style={[styles.formatText, period === "AM" && styles.formatTextActive]}>صباحًا</Text></Pressable><Pressable onPress={() => changePeriod("PM")} style={[styles.periodPill, period === "PM" && styles.formatPillActive]}><Text style={[styles.formatText, period === "PM" && styles.formatTextActive]}>مساءً</Text></Pressable></View>}</View>
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>التاريخ</Text>
                <View style={styles.datePickers}>{([ ["day", "اليوم", dateDay, days], ["month", "الشهر", dateMonth, months], ["year", "السنة", dateYear, years] ] as const).map(([part, label, value, options]) => <View key={part} style={styles.datePickerWrap}><Pressable onPress={() => setDateMenu(dateMenu === part ? null : part)} style={styles.datePicker}><Text style={styles.datePickerValue}>{value || "—"}</Text><Text style={styles.datePickerLabel}>{label}</Text></Pressable>{dateMenu === part && <View style={styles.dropdown}><ScrollView nestedScrollEnabled showsVerticalScrollIndicator>{options.map((option) => <Pressable key={option} onPress={() => updateDatePart(part, option)} style={styles.dropdownOption}><Text style={styles.dropdownText}>{option}</Text></Pressable>)}</ScrollView></View>}</View>)}</View>
              </View>
            </View>

            <Text style={styles.label}>التنبيه قبل الموعد بالدقائق</Text>
            <View style={styles.reminderRow}>
              {[0, 15, 30, 60, 1440].map((value) => (
                <Pressable key={value} onPress={() => setReminderMinutes(String(value))} style={[styles.reminderPill, Number(reminderMinutes) === value && styles.reminderPillActive]}>
                  <Text style={[styles.reminderText, Number(reminderMinutes) === value && styles.reminderTextActive]}>{value === 0 ? "بدون" : value === 1440 ? "يوم" : value}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => setRepeatWeekly((value) => !value)} style={styles.repeatRow}>
              <View style={[styles.repeatCheck, repeatWeekly && styles.repeatCheckActive]}>{repeatWeekly && <IconSymbol name="check" size={14} color={PALETTE.white} />}</View>
              <View style={styles.repeatCopy}><Text style={styles.repeatTitle}>تكرار الحصة أسبوعيًا</Text><Text style={styles.repeatSubtitle}>ينشئ الموعد للأسبوع الحالي والأسابيع السبعة القادمة</Text></View>
            </Pressable>

            <Text style={styles.label}>ملاحظات (اختياري)</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="أضف أي تفاصيل تساعدك" placeholderTextColor="#AAB5BF" style={[styles.input, styles.notes]} textAlign="right" multiline />

            <Pressable onPress={save} disabled={saving || !title.trim()} style={({ pressed }) => [styles.saveButton, (!title.trim() || saving) && styles.disabled, pressed && styles.pressed]}>
              <IconSymbol name="check" size={20} color={PALETTE.white} />
              <Text style={styles.saveText}>{saving ? "جارٍ الحفظ..." : event ? "حفظ التعديلات" : "إضافة للروزنامة"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,35,48,0.36)" },
  sheet: { maxHeight: "92%", backgroundColor: PALETTE.white, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: PALETTE.border },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: PALETTE.canvas, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, alignItems: "flex-end", marginRight: 12 },
  sheetTitle: { color: PALETTE.ink, fontSize: 20, fontWeight: "800", textAlign: "right" },
  sheetSubtitle: { color: PALETTE.muted, fontSize: 12, marginTop: 3, textAlign: "right" },
  content: { padding: 20, paddingBottom: 34 },
  label: { color: PALETTE.ink, fontSize: 13, fontWeight: "700", marginTop: 14, marginBottom: 7, textAlign: "right" },
  input: { minHeight: 48, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 14, paddingHorizontal: 14, color: PALETTE.ink, fontSize: 15, backgroundColor: "#FBFCFE" },
  notes: { minHeight: 82, paddingTop: 12, textAlignVertical: "top" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  typePill: { flexDirection: "row-reverse", alignItems: "center", gap: 6, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 },
  typeText: { color: PALETTE.muted, fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row-reverse", gap: 10 },
  half: { flex: 1 },
  datePickers: { flexDirection: "row-reverse", gap: 5 },
  datePickerWrap: { flex: 1, position: "relative", zIndex: 2 },
  datePicker: { minHeight: 48, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, backgroundColor: "#FBFCFE", alignItems: "center", justifyContent: "center" },
  datePickerValue: { color: PALETTE.ink, fontSize: 15, fontWeight: "800" },
  datePickerLabel: { color: PALETTE.muted, fontSize: 9, marginTop: 2 },
  dropdown: { position: "absolute", top: 51, left: 0, right: 0, maxHeight: 170, backgroundColor: PALETTE.white, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 10, zIndex: 10, elevation: 6, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  dropdownOption: { minHeight: 40, paddingVertical: 9, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#F0F3F5" },
  dropdownText: { color: PALETTE.ink, fontSize: 13, fontWeight: "700" },
  timePickers: { flexDirection: "row-reverse", gap: 7 },
  timePickerWrap: { flex: 1, position: "relative", zIndex: 3 },
  timePicker: { minHeight: 48, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, backgroundColor: "#FBFCFE", alignItems: "center", justifyContent: "center" },
  timePickerValue: { color: PALETTE.ink, fontSize: 15, fontWeight: "800" },
  timePickerLabel: { color: PALETTE.muted, fontSize: 9, marginTop: 2 },
  formatRow: { flexDirection: "row-reverse", gap: 6, marginBottom: 6 },
  formatPill: { flex: 1, paddingVertical: 7, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 9, alignItems: "center" },
  formatPillActive: { backgroundColor: "#E5F6F2", borderColor: PALETTE.teal },
  formatText: { color: PALETTE.muted, fontSize: 10, fontWeight: "800" },
  formatTextActive: { color: PALETTE.teal },
  periodWrap: { width: 76, gap: 5 },
  periodPill: { flex: 1, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  reminderRow: { flexDirection: "row-reverse", gap: 7 },
  reminderPill: { flex: 1, height: 38, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reminderPillActive: { backgroundColor: "#E5F6F2", borderColor: PALETTE.teal },
  reminderText: { color: PALETTE.muted, fontSize: 12, fontWeight: "700" },
  reminderTextActive: { color: PALETTE.teal },
  repeatRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginTop: 18, padding: 12, borderRadius: 14, backgroundColor: "#F1FAF8", borderWidth: 1, borderColor: "#D6F0EB" },
  repeatCheck: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: "#B8C8CC", alignItems: "center", justifyContent: "center" },
  repeatCheckActive: { backgroundColor: PALETTE.teal, borderColor: PALETTE.teal },
  repeatCopy: { flex: 1, alignItems: "flex-end" },
  repeatTitle: { color: PALETTE.ink, fontSize: 13, fontWeight: "800", textAlign: "right" },
  repeatSubtitle: { color: PALETTE.muted, fontSize: 10, marginTop: 3, textAlign: "right" },
  saveButton: { marginTop: 24, height: 54, borderRadius: 17, backgroundColor: PALETTE.teal, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 9 },
  saveText: { color: PALETTE.white, fontSize: 15, fontWeight: "800" },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  disabled: { opacity: 0.45 },
});
