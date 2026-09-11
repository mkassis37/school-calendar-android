from pathlib import Path
p=Path('/home/ubuntu/school-calendar-android/app/(tabs)/settings.tsx')
s=p.read_text()
needle='settingIcon: { width: 42, height: 42,'
insert='transferHint: { color: C.muted, fontSize: 11, lineHeight: 18, textAlign: "right", padding: 13 }, transferRow: { flexDirection: "row-reverse", gap: 8, padding: 13, paddingTop: 0 }, transferButton: { flex: 1, backgroundColor: C.teal, borderRadius: 11, paddingVertical: 11, alignItems: "center" }, transferButtonText: { color: C.white, fontSize: 11, fontWeight: "900" }, importButton: { backgroundColor: "#E5F6F2", borderWidth: 1, borderColor: C.teal }, importButtonText: { color: C.teal, fontSize: 11, fontWeight: "900" }, '
if 'transferHint:' not in s:
    s=s.replace(needle,insert+needle)
p.write_text(s)
