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
}: {
  visible: boolean;
  event?: CalendarEvent | null;
  defaultDate: string;
  onClose: () => void;
  onSave: (value: NewEvent) => Promise<void>;
  reminderDefaults?: ReminderDefaults;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("08:00");
  const [type, setType] = useState<EventType>("lesson");
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [notes, setNotes] = useState("");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(event?.title ?? "");
    setSubject(event?.subject ?? "");
    setDate(event?.date ?? defaultDate);
    setTime(event?.time ?? "08:00");
    setType(event?.type ?? "lesson");
    setReminderMinutes(String(event?.reminderMinutes ?? (event?.type === "exam" ? reminderDefaults?.exam : event?.type === "homework" ? reminderDefaults?.homework : 15)));
    setNotes(event?.notes ?? "");
    setRepeatWeekly(event?.repeatWeekly ?? false);
  }, [visible, event, defaultDate, reminderDefaults]);

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                <TextInput value={time} onChangeText={setTime} placeholder="08:00" placeholderTextColor="#AAB5BF" style={styles.input} textAlign="right" keyboardType="numbers-and-punctuation" />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>التاريخ</Text>
                <TextInput value={date} onChangeText={setDate} placeholder="2026-09-14" placeholderTextColor="#AAB5BF" style={styles.input} textAlign="right" keyboardType="numbers-and-punctuation" />
              </View>
            </View>

            <Text style={styles.label}>التنبيه لهذا الموعد</Text>
            <Text style={styles.reminderHint}>هذا الاختيار خاص بهذا الواجب أو الامتحان ولا يغيّر الإعداد الافتراضي.</Text>
            <View style={styles.reminderRow}>
              {[0, 15, 30, 60, 1440].map((value) => (
                <Pressable key={value} onPress={() => setReminderMinutes(String(value))} style={[styles.reminderPill, Number(reminderMinutes) === value && styles.reminderPillActive]}>
                  <Text style={[styles.reminderText, Number(reminderMinutes) === value && styles.reminderTextActive]}>{value === 0 ? "بدون" : value === 1440 ? "يوم" : value}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={reminderMinutes} onChangeText={(value) => setReminderMinutes(value.replace(/[^0-9]/g, ""))} placeholder="دقائق مخصصة" placeholderTextColor="#AAB5BF" style={styles.customReminder} textAlign="right" keyboardType="number-pad" />

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
  reminderRow: { flexDirection: "row-reverse", gap: 7 },
  reminderPill: { flex: 1, height: 38, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reminderPillActive: { backgroundColor: "#E5F6F2", borderColor: PALETTE.teal },
  reminderText: { color: PALETTE.muted, fontSize: 12, fontWeight: "700" },
  reminderTextActive: { color: PALETTE.teal },
  reminderHint: { color: PALETTE.muted, fontSize: 10, textAlign: "right", marginTop: -3, marginBottom: 7 },
  customReminder: { minHeight: 42, borderWidth: 1, borderColor: PALETTE.border, borderRadius: 12, paddingHorizontal: 12, color: PALETTE.ink, fontSize: 13, backgroundColor: "#FBFCFE", marginTop: 8 },
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
