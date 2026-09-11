from pathlib import Path
settings=Path('/home/ubuntu/school-calendar-android/app/(tabs)/settings.tsx')
s=settings.read_text()
needle='transferHint: { color: C.muted,'
insert='alarmTimeRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 13, paddingTop: 0 }, alarmInput: { width: 82, height: 40, borderWidth: 1, borderColor: C.border, borderRadius: 10, color: C.ink, fontSize: 16, fontWeight: "900" }, alarmHint: { flex: 1, color: C.muted, fontSize: 10, textAlign: "right" }, '
if 'alarmTimeRow:' not in s: s=s.replace(needle,insert+needle)
settings.write_text(s)
config=Path('/home/ubuntu/school-calendar-android/app.config.ts')
s=config.read_text().replace('image: "./assets/images/splash-icon.png",','image: "./assets/images/icon.png",')
config.write_text(s)
