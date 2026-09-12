from pathlib import Path
p=Path('/home/ubuntu/school-calendar-android/app/(tabs)/tasks.tsx')
s=p.read_text()
s=s.replace('TaskRow event={item}', 'TaskRow timeFormat={timeFormat} event={item}')
s=s.replace('function TaskRow({ event, onToggle, onEdit }:', 'function TaskRow({ event, timeFormat, onToggle, onEdit }:')
s=s.replace('event: CalendarEvent; onToggle:', 'event: CalendarEvent; timeFormat: 12 | 24; onToggle:', 1)
p.write_text(s)
