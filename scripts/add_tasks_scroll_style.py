from pathlib import Path
p=Path('/home/ubuntu/school-calendar-android/app/(tabs)/tasks.tsx')
s=p.read_text()
s=s.replace('const styles = StyleSheet.create({ page: { flex: 1, paddingHorizontal: 18 },', 'const styles = StyleSheet.create({ page: { flex: 1, paddingHorizontal: 18 }, pageContent: { paddingBottom: 28 },', 1)
p.write_text(s)
