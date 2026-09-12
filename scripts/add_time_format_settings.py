from pathlib import Path
p=Path('/home/ubuntu/school-calendar-android/app/(tabs)/settings.tsx')
s=p.read_text()
needle='settingRow: { minHeight: 73,'
insert='formatSettingRow: { flexDirection: "row-reverse", gap: 8, padding: 13, paddingTop: 0 }, formatSettingButton: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center" }, formatSettingActive: { backgroundColor: "#E5F6F2", borderColor: C.teal }, formatSettingText: { color: C.muted, fontSize: 11, fontWeight: "800" }, formatSettingTextActive: { color: C.teal }, '
if 'formatSettingRow:' not in s: s=s.replace(needle, insert+needle)
p.write_text(s)
