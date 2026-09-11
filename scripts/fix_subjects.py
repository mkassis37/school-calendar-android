from pathlib import Path
p=Path('/home/ubuntu/school-calendar-android/app/(tabs)/settings.tsx')
s=p.read_text()
s=s.replace('styles.addSubjectText', '{ color: C.white, fontSize: 11, fontWeight: "900" }')
s=s.replace('subjectColors[subjects.length % subjectColors.length]', 'subjectColors[subjects.length % subjectColors.length]')
s=s.replace('subjectColors[name] === subjectColors[index % subjectColors.length]', 'savedSubjectColors[name] === subjectColors[index % subjectColors.length]')
s=s.replace('subjectColors[name] ?? subjectColors[index % subjectColors.length]', 'savedSubjectColors[name] ?? subjectColors[index % subjectColors.length]')
s=s.replace('styles.removeSubject', '{ color: "#C04A75", fontSize: 10, fontWeight: "800" }')
p.write_text(s)
