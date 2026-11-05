# You redesign, Part 7: Settings and data

**Spec:** section 4.7. **Overview:** `2026-11-05-you-redesign-overview.md`.

**Goal:** A Settings page grouped the way the owner thinks, and data that is demonstrably safe.

- Groups: About you, Targets, Places and the walk, Checklist, Food categories, Moments and themes, Privacy, Data and backups, Connections. Session settings move to a sheet on Train and stay reachable from Settings.
- `src/db/backup.ts`: `confirmReadBack`, `checkBackupFile`, `backupWords`. A failed read-back throws and leaves no stamp.
- `src/db/snapshots.ts`, Dexie v8 `snapshots`: seven dailies plus one before any big change. Restoring takes one first. Snapshots stay out of backup files.
- `src/domain/checkup.ts`, `src/db/checkup.ts`: empty days, double entries, a weight far off its neighbours, unfinished sessions, steps far above usual, doses ticked twice. Each has a fix, recorded as an edit so it can be undone, and "That's right" keeps it quiet.
- `src/screens/DataPages.tsx`: Data check-up, Edit history by day, Snapshots.
- Removes Larger text, High contrast, Big dials, Units row.
- Tests: `tests/data-safety.test.ts`, `tests/checkup.test.ts`.
- **Exit check, production build:** in the built app, back up through a stubbed share sheet, confirm the stamp, then check the same file without restoring.
