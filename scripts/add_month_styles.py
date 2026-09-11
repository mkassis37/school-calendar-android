from pathlib import Path
p=Path('/home/ubuntu/school-calendar-android/app/(tabs)/index.tsx')
s=p.read_text()
needle='weekCard: { flexDirection: "row-reverse",'
insert='swipeHint: { color: C.muted, fontSize: 10, fontWeight: "700" }, monthCard: { backgroundColor: C.white, borderRadius: 19, padding: 10, borderWidth: 1, borderColor: C.border }, weekdayRow: { flexDirection: "row-reverse", marginBottom: 5 }, weekday: { flex: 1, textAlign: "center", color: C.muted, fontSize: 10, fontWeight: "800", paddingVertical: 6 }, monthGrid: { flexDirection: "row-reverse", flexWrap: "wrap" }, monthDay: { width: "14.2857%", height: 47, alignItems: "center", justifyContent: "center", borderRadius: 12, gap: 5 }, monthDayNumber: { color: C.ink, fontSize: 14, fontWeight: "800" }, '
if 'monthGrid:' not in s:
    s=s.replace(needle,insert+needle)
p.write_text(s)
