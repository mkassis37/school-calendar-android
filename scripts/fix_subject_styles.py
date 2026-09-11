from pathlib import Path
p=Path('/home/ubuntu/school-calendar-android/app/(tabs)/settings.tsx')
s=p.read_text()
needle='settingIcon: { width: 42, height: 42,'
insert='addSubjectRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: C.border }, subjectInput: { flex: 1, height: 40, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, color: C.ink, fontSize: 12 }, addSubjectButton: { backgroundColor: C.teal, borderRadius: 10, paddingHorizontal: 14, height: 40, alignItems: "center", justifyContent: "center" }, '
if needle in s and 'addSubjectRow:' not in s:
    s=s.replace(needle,insert+needle)
p.write_text(s)
