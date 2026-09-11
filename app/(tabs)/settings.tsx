import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useCalendar } from "@/lib/calendar-store";

const C = { ink: "#142330", muted: "#738291", teal: "#1AA394", canvas: "#F7F9FC", white: "#FFFFFF", border: "#E7ECF2" };
const subjects = [{ name: "رياضيات", color: "#2878C8" }, { name: "عربي", color: "#E26B45" }, { name: "علوم", color: "#0F8C7D" }, { name: "إنجليزي", color: "#8559B4" }];

export default function SettingsScreen() {
  const { notificationsEnabled, requestNotifications } = useCalendar();
  const [darkMode, setDarkMode] = useState(false);
  const enable = async () => { const granted = await requestNotifications(); if (!granted) Alert.alert("التنبيهات غير مفعّلة", "يمكنك تفعيلها من إعدادات Android للسماح بالتذكير قبل الدروس والواجبات."); };
  return <ScreenContainer className="bg-[#F7F9FC]" edges={["top", "left", "right"]}>
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={styles.title}>الإعدادات</Text><Text style={styles.subtitle}>خلّي الروزنامة على طريقتك</Text></View>
      <Text style={styles.section}>التنبيهات</Text>
      <View style={styles.card}><View style={styles.settingRow}><View style={styles.settingIcon}><IconSymbol name={notificationsEnabled ? "notificationsActive" : "notifications"} size={22} color={C.teal} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>تذكيرات الدراسة</Text><Text style={styles.settingSub}>{notificationsEnabled ? "مفعّلة على جهازك" : "تنبيه قبل الدرس أو المهمة"}</Text></View><Switch value={notificationsEnabled} onValueChange={enable} trackColor={{ false: "#D9E1E7", true: "#A9E4D9" }} thumbColor={notificationsEnabled ? C.teal : "#FFFFFF"} /></View><Text style={styles.helper}>تعمل التنبيهات حتى لو كان التطبيق مغلقًا، وتُحفظ المواعيد محليًا.</Text></View>
      <Text style={styles.section}>المظهر</Text>
      <View style={styles.card}><View style={styles.settingRow}><View style={[styles.settingIcon, { backgroundColor: "#F2EBF8" }]}><IconSymbol name="settings" size={21} color="#8559B4" /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>الوضع الداكن</Text><Text style={styles.settingSub}>قريبًا في النسخة القادمة</Text></View><Switch value={darkMode} onValueChange={setDarkMode} disabled trackColor={{ false: "#E7ECF2", true: "#E7ECF2" }} thumbColor="#B7C1C9" /></View></View>
      <Text style={styles.section}>المواد</Text>
      <View style={styles.card}>{subjects.map((subject, index) => <View key={subject.name} style={[styles.subjectRow, index < subjects.length - 1 && styles.divider]}><View style={[styles.subjectDot, { backgroundColor: subject.color }]} /><Text style={styles.subjectName}>{subject.name}</Text><IconSymbol name="chevronDown" size={19} color="#A7B2BC" /></View>)}</View>
      <Text style={styles.section}>عن التطبيق</Text>
      <View style={styles.aboutCard}><View style={styles.aboutLogo}><IconSymbol name="calendar" size={24} color={C.white} /></View><View style={styles.aboutCopy}><Text style={styles.aboutTitle}>روزنامتي الدراسية</Text><Text style={styles.aboutSub}>نسخة تجريبية · مصممة للدراسة بدون تعقيد</Text></View><Text style={styles.version}>١.٠</Text></View>
      <View style={styles.offline}><IconSymbol name="cloudOff" size={17} color={C.teal} /><Text style={styles.offlineText}>كل مواعيدك محفوظة على الجهاز ويمكن الوصول إليها بدون إنترنت.</Text></View>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({ page: { paddingHorizontal: 18, paddingBottom: 30 }, header: { height: 100, justifyContent: "center", alignItems: "flex-end" }, title: { color: C.ink, fontSize: 27, fontWeight: "900", textAlign: "right" }, subtitle: { color: C.muted, fontSize: 12, fontWeight: "600", marginTop: 3, textAlign: "right" }, section: { color: C.muted, fontSize: 12, fontWeight: "900", marginTop: 17, marginBottom: 8, textAlign: "right" }, card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 17, overflow: "hidden" }, settingRow: { minHeight: 73, padding: 13, flexDirection: "row-reverse", alignItems: "center", gap: 11 }, settingIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#E5F6F2", alignItems: "center", justifyContent: "center" }, settingCopy: { flex: 1, alignItems: "flex-end" }, settingTitle: { color: C.ink, fontSize: 14, fontWeight: "900", textAlign: "right" }, settingSub: { color: C.muted, fontSize: 11, marginTop: 3, textAlign: "right" }, helper: { color: C.muted, fontSize: 10, lineHeight: 17, borderTopWidth: 1, borderTopColor: C.border, padding: 12, textAlign: "right" }, subjectRow: { height: 52, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, gap: 10 }, divider: { borderBottomWidth: 1, borderBottomColor: C.border }, subjectDot: { width: 9, height: 9, borderRadius: 5, marginLeft: "auto" }, subjectName: { color: C.ink, fontSize: 13, fontWeight: "700" }, aboutCard: { flexDirection: "row-reverse", alignItems: "center", gap: 11, backgroundColor: C.white, borderRadius: 17, borderWidth: 1, borderColor: C.border, padding: 14 }, aboutLogo: { width: 43, height: 43, borderRadius: 14, backgroundColor: C.teal, alignItems: "center", justifyContent: "center" }, aboutCopy: { flex: 1, alignItems: "flex-end" }, aboutTitle: { color: C.ink, fontSize: 13, fontWeight: "900", textAlign: "right" }, aboutSub: { color: C.muted, fontSize: 10, marginTop: 3, textAlign: "right" }, version: { color: C.muted, fontSize: 10 }, offline: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 20 }, offlineText: { color: C.teal, fontSize: 10, fontWeight: "700", textAlign: "center" },
});
