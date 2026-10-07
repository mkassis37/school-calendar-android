---
name: arabic-school-calendar-builder
description: Build and improve an offline-first Arabic RTL school calendar Android app with Expo. Use for monthly calendar UX, custom subjects, event/task progress, local notifications, multiple reminders, smart exam plans, morning summaries, notification actions, cloud/local data transfer, Google Play Protect-conscious APK configuration, and validation.
---

# Arabic RTL School Calendar Builder

Build and maintain a school calendar app that starts with empty user data, works offline first, and uses optional internet features only for sync and updates.

## Core product rules

- Keep the interface Arabic and RTL.
- Start a fresh install with no seeded subjects, events, students, or example appointments.
- Use a monthly calendar as the primary screen, with horizontal swipe navigation and an explicit month/year picker.
- Support user-created subjects, colors, homework, exams, lessons, evaluations, activities, completion tracking, notes, and weekly repetition.
- Preserve historical event subject text when a subject is deleted unless the user explicitly requests migration or deletion.
- Keep forms keyboard-aware and scrollable; use safe-area containers on every screen.
- Persist calendar data and preferences locally with AsyncStorage. Cloud backup remains optional.

## Required implementation sequence

1. **Inspect before editing**
   - Read this skill and the Expo mobile guidance.
   - Locate the central calendar store, event editor, calendar screen, tasks screen, settings screen, tests, `app.config.ts`, and notification documentation.
   - Inspect current types and migration compatibility before changing the data model.

2. **Keep the data model portable**
   - Define `CalendarEvent`, `EventType`, reminder plans, notification history, and settings in the central store.
   - Store event reminder times as an array of minute offsets, e.g. `reminderMinutesList: number[]`.
   - Keep legacy `reminderMinutes` and `notificationId` fields readable for migration, but do not export platform notification IDs.
   - Normalize imported/local data defensively: validate arrays, strings, dates, times, colors, reminder ranges, and event types before applying them.

3. **Implement multiple reminders**
   - In the editor, allow selecting several offsets for one event: no reminder, minutes, hours, day, and week.
   - Make the selected values visibly active and explain that multiple notifications can be scheduled.
   - Schedule one notification per future offset and save every returned ID in `notificationIds`.
   - Skip past triggers without failing the remaining reminders.
   - When notifications are disabled, cancel every stored ID and clear IDs from events.

4. **Implement default reminder plans**
   - Persist separate default arrays for lessons, homework, exams, evaluations, and activities.
   - When creating an event with no explicit reminder list, resolve in this order:
     1. event-specific list;
     2. subject-specific plan;
     3. type-specific default plan.
   - When editing an existing event, preserve its explicit plan until the user changes it.
   - Expose the defaults and subject plans in settings with multi-select controls.

5. **Add smart exam reminders**
   - Let an exam carry `importance: normal | important | critical`.
   - For important exams, add an earlier reminder such as two days before; for critical exams, add one week and two days before.
   - Merge smart offsets with the chosen plan using a set, sort them consistently, and never duplicate a reminder.
   - Show the importance and all reminder times in event details.

6. **Use clear Arabic notification content**
   - Include the event kind, subject, date, time, title, and relative lead time in Arabic.
   - Select the homework/exam sound and Android channel by event type.
   - Register notification categories after permission is granted. Add actions for `SNOOZE_10` and `OPEN_EVENT`.
   - Treat any normal tap or `OPEN_EVENT` response with a valid `eventId` as a request to open the event.

7. **Handle notification actions reliably**
   - Add both received and response listeners and remove them on cleanup.
   - On `SNOOZE_10`, schedule a new one-shot notification ten minutes later, retaining the event ID.
   - On open, place the event ID in provider state. The calendar screen should select the event date, move to its month, and open details.
   - Also call `getLastNotificationResponseAsync()` on startup so opening a cold app from a notification works.
   - Clear the pending event ID after navigation to avoid repeated opens.

8. **Cancel stale notifications**
   - Before updating an event, cancel all old IDs, including legacy `notificationId` and array IDs.
   - Before deleting an event, cancel all its IDs.
   - When re-enabling notifications, cancel old IDs and reschedule from current event data.
   - When importing or restoring cloud data, cancel current event reminders before replacing the dataset, then schedule the imported events.
   - Catch cancellation errors because Android may already have delivered or removed a notification.

9. **Add the daily morning summary**
   - Store the daily summary enabled state and 12-hour time.
   - Schedule a daily notification on the alarm channel with only events whose date is today, sorted by time.
   - Use Arabic text such as “ملخص مواعيد اليوم” and show “لا توجد مواعيد دراسية اليوم” when empty.
   - Cancel the previous daily notification before changing time or disabling it.
   - Explain in the UI that Android notification-channel sound choices are controlled by device settings.

10. **Add the upcoming-event countdown**
    - On the calendar screen, find the nearest incomplete event whose local date/time is in the future.
    - Display its title, Arabic date, formatted time, and remaining days/hours/minutes.
    - Avoid hardcoded placeholder counts. If no future event exists, hide the countdown card.
    - Recompute when events change and keep the display usable in both 12-hour and 24-hour modes.

11. **Build the calendar UX**
    - Calculate Monday-first month grids from `Date` values.
    - Keep selected dates valid after month swipes or month/year selection.
    - Use `FlatList` for long event lists and avoid `ScrollView` plus large mapped lists.
    - Never put `className` on `Pressable`; use `style` for press feedback.

12. **Secure data and APK behavior**
    - Request only required Android permissions, including notifications and internet when needed.
    - Do not implement or claim an in-app antivirus scanner. Google Play Protect is controlled by Android/Google.
    - Keep cloud payload validation strict and do not trust imported JSON, cloud data, notification IDs, or sound names.
    - Do not include executable or obfuscated payloads in the APK.

## Validation checklist

Run all of the following before delivery:

```bash
pnpm check
pnpm test
pnpm build
npx expo config --type public --json >/tmp/expo-config.json
git diff --check
```

Test or inspect these flows:

- Fresh install has no seeded events or subjects.
- A single event can schedule multiple future reminders.
- Editing an event cancels old IDs and schedules the new plan.
- Deleting an event cancels all old IDs.
- Important and critical exams receive earlier smart reminders without duplicates.
- Notification actions snooze for ten minutes or open the correct event.
- Opening the app from a notification while it was closed opens the event details.
- Morning summary contains only today’s events.
- Countdown selects the nearest incomplete future event.
- Import and cloud restore replace data only after confirmation and reschedule reminders.
- Notification history is persisted, bounded, and clearable.

Save one WebDev checkpoint after the feature set passes validation. Report test results and state any Android notification-channel or APK distribution limitations honestly.
