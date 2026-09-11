import { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { EventEditor } from "@/components/event-editor";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { addDays, arabicNumber, EVENT_META, formatArabicDate, formatDayNumber, parseDateKey, SHORT_DAYS, startOfWeek, toDateKey, useCalendar, type CalendarEvent } from "@/lib/calendar-store";

const C = { ink: "#142330", muted: "#738291", teal: "#1AA394", canvas: "#F7F9FC", white: "#FFFFFF", border: "#E7ECF2", soft: "#EDF8F6", amber: "#D28A24" };

export default function CalendarScreen() {
  const { events, hydrated, subjectColors, reminderDefaults, addEvent, updateEvent, deleteEvent, toggleEvent } = useCalendar();
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [weekAnchor, setWeekAnchor] = useState(startOfWeek(new Date()));
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [detailsEvent, setDetailsEvent] = useState<CalendarEvent | null>(null);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekAnchor, index)), [weekAnchor]);
  const selectedEvents = useMemo(() => events.filter((event) => event.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)), [events, selectedDate]);
  const selectedDateObj = parseDateKey(selectedDate);
  const todayKey = toDateKey(new Date());
  const completedCount = events.filter((event) => event.done).length;

  const openNew = () => { setEditingEvent(null); setEditorVisible(true); };
  const openEdit = (event: CalendarEvent) => { setEditingEvent(event); setEditorVisible(true); };
  const moveWeek = (amount: number) => {
    const next = addDays(weekAnchor, amount * 7);
    setWeekAnchor(next);
    setSelectedDate(toDateKey(next));
  };
  const confirmDelete = (event: CalendarEvent) => Alert.alert("حذف الموعد؟", `سيتم حذف «${event.title}» من جهازك.`, [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: () => void deleteEvent(event.id) }]);

  return (
    <ScreenContainer className="bg-background" edges={["top", "left", "right"]}>
      <View style={styles.page}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.logo}><IconSymbol name="calendar" size={23} color={C.white} /></View>
            <View><Text style={styles.brand}>روزنامتي</Text><Text style={styles.brandSub}>الدراسية</Text></View>
          </View>
          <View style={styles.topActions}>
            <Pressable onPress={() => { setSelectedDate(todayKey); setWeekAnchor(startOfWeek(new Date())); }} style={styles.todayButton}><IconSymbol name="today" size={18} color={C.teal} /><Text style={styles.todayText}>اليوم</Text></Pressable>
            <Pressable onPress={openNew} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><IconSymbol name="add" size={22} color={C.white} /></Pressable>
          </View>
        </View>

        <View style={styles.offlineStrip}><IconSymbol name="cloudOff" size={16} color={C.teal} /><Text style={styles.offlineText}>يعمل دون إنترنت · كل بياناتك محفوظة على هذا الجهاز</Text></View>

        <View style={styles.monthRow}>
          <Text style={styles.monthTitle}>{formatArabicDate(selectedDateObj)}</Text>
          <View style={styles.arrows}><Pressable accessibilityLabel="الأسبوع السابق" onPress={() => moveWeek(-1)} style={styles.arrow}><IconSymbol name="back" size={19} color={C.ink} /></Pressable><Pressable accessibilityLabel="الأسبوع اللاحق" onPress={() => moveWeek(1)} style={styles.arrow}><IconSymbol name="arrow" size={19} color={C.ink} /></Pressable></View>
        </View>

        <View style={styles.weekCard}>
          {week.map((date, index) => {
            const key = toDateKey(date);
            const active = key === selectedDate;
            const isToday = key === todayKey;
            const count = events.filter((event) => event.date === key).length;
            return <Pressable key={key} onPress={() => setSelectedDate(key)} style={[styles.dayCell, active && styles.dayCellActive]}><Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{SHORT_DAYS[index]}</Text><View style={[styles.dayNumber, active && styles.dayNumberActive, isToday && !active && styles.dayNumberToday]}><Text style={[styles.dayNumberText, active && styles.dayNumberTextActive]}>{formatDayNumber(date)}</Text></View><View style={styles.dotRow}>{count > 0 ? <View style={[styles.eventDot, active && { backgroundColor: C.white }]} /> : <View style={styles.emptyDot} />}</View></Pressable>;
          })}
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{selectedDate === todayKey ? "اليوم" : formatArabicDate(selectedDateObj)}</Text><Text style={styles.sectionCount}>{arabicNumber(selectedEvents.length)} مواعيد</Text></View>

        {!hydrated ? <View style={styles.loading}><Text style={styles.muted}>جارٍ تجهيز تقويمك...</Text></View> : <FlatList data={selectedEvents} keyExtractor={(item) => item.id} contentContainerStyle={selectedEvents.length ? styles.list : styles.emptyList} showsVerticalScrollIndicator={false} renderItem={({ item }) => <EventCard event={item} subjectColor={subjectColors[item.subject]} onDetails={() => setDetailsEvent(item)} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} onToggle={() => void toggleEvent(item.id)} />} ListEmptyComponent={<View style={styles.emptyState}><View style={styles.emptyIcon}><IconSymbol name="calendar" size={28} color={C.teal} /></View><Text style={styles.emptyTitle}>لا توجد مواعيد هنا</Text><Text style={styles.emptyText}>أضف درسًا أو واجبًا أو امتحانًا ليظهر في جدولك.</Text><Pressable onPress={openNew} style={styles.emptyButton}><IconSymbol name="add" size={18} color={C.white} /><Text style={styles.emptyButtonText}>إضافة موعد</Text></Pressable></View>} />}

        <View style={styles.progressCard}><View style={styles.progressTop}><Text style={styles.progressTitle}>تقدّمك هذا الأسبوع</Text><Text style={styles.progressValue}>{arabicNumber(completedCount)} / {arabicNumber(events.length)} مكتمل</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${events.length ? Math.max(4, (completedCount / events.length) * 100) : 0}%` }]} /></View></View>
      </View>
      <EventEditor visible={editorVisible} event={editingEvent} reminderDefaults={reminderDefaults} defaultDate={selectedDate} onClose={() => setEditorVisible(false)} onSave={async (value) => { if (editingEvent) await updateEvent(editingEvent.id, value); else await addEvent(value); setSelectedDate(value.date); setWeekAnchor(startOfWeek(parseDateKey(value.date))); setEditorVisible(false); }} />
      <EventDetails event={detailsEvent} onClose={() => setDetailsEvent(null)} />
    </ScreenContainer>
  );
}

function EventCard({ event, subjectColor, onDetails, onEdit, onDelete, onToggle }: { event: CalendarEvent; subjectColor?: string; onDetails: () => void; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  const meta = EVENT_META[event.type];
  const accent = subjectColor ?? meta.color;
  return <Pressable onPress={onDetails} onLongPress={onDelete} style={({ pressed }) => [styles.eventCard, pressed && styles.cardPressed]}><View style={[styles.eventAccent, { backgroundColor: accent }]} /><View style={styles.eventMain}><View style={styles.eventTop}><View style={styles.eventActions}><Pressable onPress={onDelete} hitSlop={8}><IconSymbol name="delete" size={18} color="#A7B2BC" /></Pressable><Pressable onPress={onEdit} hitSlop={8}><IconSymbol name="edit" size={17} color="#A7B2BC" /></Pressable></View><View style={styles.eventTitleWrap}><View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}><View style={[{ width: 8, height: 8, borderRadius: 4 }, { backgroundColor: accent }]} /><Text style={[styles.eventTitle, event.done && styles.doneText]}>{event.title}</Text></View><Text style={styles.eventSubject}>{event.subject}</Text></View></View><View style={styles.eventBottom}><Pressable onPress={onToggle} style={[styles.doneButton, event.done && { backgroundColor: C.teal, borderColor: C.teal }]}><IconSymbol name="check" size={14} color={event.done ? C.white : "#A4B1BC"} /></Pressable><Text style={styles.eventTime}>{event.time}</Text><View style={[styles.typeBadge, { backgroundColor: meta.soft }]}><Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text></View></View></View></Pressable>;
}

function EventDetails({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  if (!event) return null;
  const meta = EVENT_META[event.type];
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.detailsOverlay}><View style={styles.detailsSheet}><View style={styles.detailsHeader}><Text style={styles.detailsTitle}>تفاصيل الموعد</Text><Pressable onPress={onClose} style={styles.iconButton}><IconSymbol name="close" size={20} color={C.muted} /></Pressable></View><View style={styles.detailsBadge}><Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text></View><Text style={styles.detailsEventTitle}>{event.title}</Text><Text style={styles.detailsSubject}>{event.subject}</Text><View style={styles.detailsRows}><DetailRow label="التاريخ" value={formatArabicDate(parseDateKey(event.date))} /><DetailRow label="الوقت" value={event.time} /><DetailRow label="التنبيه" value={event.reminderMinutes === 0 ? "بدون تنبيه" : `قبل ${event.reminderMinutes} دقيقة`} /><DetailRow label="الحالة" value={event.done ? "مكتمل" : "غير مكتمل"} />{event.repeatWeekly ? <DetailRow label="التكرار" value="أسبوعيًا" /> : null}</View>{event.notes ? <View style={styles.notesBox}><Text style={styles.notesLabel}>ملاحظات</Text><Text style={styles.notesText}>{event.notes}</Text></View> : null}<Pressable onPress={onClose} style={styles.closeDetails}><Text style={styles.closeDetailsText}>إغلاق</Text></Pressable></View></View></Modal>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailValue}>{value}</Text><Text style={styles.detailLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 18 }, topBar: { height: 70, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, brandRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 }, logo: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.teal, alignItems: "center", justifyContent: "center" }, brand: { color: C.ink, fontSize: 18, fontWeight: "900", textAlign: "right" }, brandSub: { color: C.muted, fontSize: 11, fontWeight: "600", marginTop: 1, textAlign: "right" }, topActions: { flexDirection: "row-reverse", alignItems: "center", gap: 8 }, todayButton: { height: 36, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, flexDirection: "row-reverse", alignItems: "center", gap: 5 }, todayText: { color: C.teal, fontSize: 12, fontWeight: "800" }, addButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.teal, alignItems: "center", justifyContent: "center", shadowColor: C.teal, shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 }, offlineStrip: { height: 32, borderRadius: 10, backgroundColor: C.soft, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 15 }, offlineText: { color: C.teal, fontSize: 11, fontWeight: "700" }, monthRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, monthTitle: { color: C.ink, fontSize: 20, fontWeight: "900", textAlign: "right" }, arrows: { flexDirection: "row-reverse", gap: 6 }, arrow: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" }, weekCard: { flexDirection: "row-reverse", backgroundColor: C.white, borderRadius: 19, padding: 8, borderWidth: 1, borderColor: C.border, shadowColor: "#142330", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 1 }, dayCell: { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 14 }, dayCellActive: { backgroundColor: C.teal }, dayLabel: { color: C.muted, fontSize: 10, fontWeight: "800", marginBottom: 5 }, dayLabelActive: { color: "#D8FFFA" }, dayNumber: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }, dayNumberActive: { backgroundColor: C.white }, dayNumberToday: { borderWidth: 1.5, borderColor: C.teal }, dayNumberText: { color: C.ink, fontSize: 14, fontWeight: "800" }, dayNumberTextActive: { color: C.teal }, dotRow: { height: 9, justifyContent: "center" }, eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.teal }, emptyDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" }, sectionHeader: { flexDirection: "row-reverse", alignItems: "baseline", justifyContent: "space-between", marginTop: 22, marginBottom: 10 }, sectionTitle: { color: C.ink, fontSize: 16, fontWeight: "900", textAlign: "right" }, sectionCount: { color: C.muted, fontSize: 12, fontWeight: "700" }, list: { paddingBottom: 9, gap: 9 }, emptyList: { flexGrow: 1, justifyContent: "center" }, eventCard: { minHeight: 95, backgroundColor: C.white, borderRadius: 17, borderWidth: 1, borderColor: C.border, flexDirection: "row-reverse", overflow: "hidden", shadowColor: "#142330", shadowOpacity: 0.035, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 }, cardPressed: { opacity: 0.82 }, eventAccent: { width: 5 }, eventMain: { flex: 1, padding: 12, paddingRight: 13 }, eventTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start" }, eventTitleWrap: { flex: 1, alignItems: "flex-end" }, eventTitle: { color: C.ink, fontSize: 15, fontWeight: "800", textAlign: "right" }, doneText: { textDecorationLine: "line-through", color: C.muted }, eventSubject: { color: C.muted, fontSize: 11, marginTop: 3, textAlign: "right" }, eventActions: { flexDirection: "row", gap: 12, marginTop: 1, marginLeft: 8 }, eventBottom: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 10 }, doneButton: { width: 21, height: 21, borderRadius: 7, borderWidth: 1.5, borderColor: "#C8D1D9", alignItems: "center", justifyContent: "center" }, eventTime: { color: C.muted, fontSize: 11, fontWeight: "700", marginLeft: "auto" }, typeBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }, typeBadgeText: { fontSize: 10, fontWeight: "800" }, emptyState: { alignItems: "center", paddingVertical: 24 }, emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: C.soft, alignItems: "center", justifyContent: "center", marginBottom: 12 }, emptyTitle: { color: C.ink, fontSize: 16, fontWeight: "900" }, emptyText: { color: C.muted, fontSize: 12, textAlign: "center", lineHeight: 19, maxWidth: 250, marginTop: 5 }, emptyButton: { flexDirection: "row-reverse", alignItems: "center", gap: 5, marginTop: 14, backgroundColor: C.teal, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 }, emptyButtonText: { color: C.white, fontSize: 12, fontWeight: "800" }, loading: { flex: 1, justifyContent: "center", alignItems: "center" }, muted: { color: C.muted }, progressCard: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 13, marginBottom: 8, marginTop: 3 }, progressTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }, progressTitle: { color: C.ink, fontSize: 12, fontWeight: "800" }, progressValue: { color: C.teal, fontSize: 11, fontWeight: "800" }, progressTrack: { height: 7, borderRadius: 5, backgroundColor: "#E9F0F1", overflow: "hidden" }, progressFill: { height: "100%", borderRadius: 5, backgroundColor: C.teal }, iconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.canvas, alignItems: "center", justifyContent: "center" }, detailsOverlay: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(20,35,48,0.42)" }, detailsSheet: { backgroundColor: C.white, borderRadius: 24, padding: 20 }, detailsHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, detailsTitle: { color: C.ink, fontSize: 18, fontWeight: "900" }, detailsBadge: { alignSelf: "flex-end", marginTop: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: C.soft }, detailsEventTitle: { color: C.ink, fontSize: 21, fontWeight: "900", textAlign: "right", marginTop: 10 }, detailsSubject: { color: C.muted, fontSize: 13, textAlign: "right", marginTop: 4 }, detailsRows: { marginTop: 18, gap: 10 }, detailRow: { flexDirection: "row-reverse", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 9 }, detailLabel: { color: C.muted, fontSize: 12 }, detailValue: { color: C.ink, fontSize: 13, fontWeight: "800" }, notesBox: { marginTop: 15, padding: 12, borderRadius: 12, backgroundColor: C.canvas }, notesLabel: { color: C.muted, fontSize: 11, textAlign: "right" }, notesText: { color: C.ink, fontSize: 13, textAlign: "right", marginTop: 5, lineHeight: 20 }, closeDetails: { marginTop: 18, height: 44, borderRadius: 13, backgroundColor: C.teal, alignItems: "center", justifyContent: "center" }, closeDetailsText: { color: C.white, fontSize: 14, fontWeight: "800" },
});
