# Health Bridge step intake

First implementation slice from the 24 November Health proposal. Use the version 1 day-file contract and synthetic data to build the local intake before connecting Drive.

## Global constraints

Preserve the current UI and make the schema upgrade additive. Keep device readings separate from manual steps and Football inputs while the real-file check is open. Bridge v1 exports the Apple Health hourly sum. Its leading source name does not identify every contribution to that sum.

## Review focus

- Midnight reset, exactly 04:00, and the sample's local offset when the browser is set to UTC.
- Adjacent day files with duplicate hours. Prefer canonical and newer observations consistently.
- Repeat imports, late corrections, failed and empty reads, and malformed batches.
- Manual steps, explicit empty fields, and existing day and Football snapshots.
- Quick backup restore from both current and older backups. Run the production build for integration compilation.

## Implementation

1. Add failing tests for the typed import entry point and the day lookup. Cover rollover, overlap, late revisions and safe rejection.
2. Add the versioned day-file reader and transactional storage. Give callers both the provider-read status and the day totals. Include the additive tables in the existing backup flow.
3. Run the focused and full suites under UTC, then build the app. Leave Drive and automatic application to existing fields pending a real Bridge file.

## Meal intake follow-up

Reuse the v1 envelope parser for meals. Key occurrences by source and provider ID, keep the original logged time and sample IDs, and store editable names, buckets and eaten times separately from the measurement. A missing occurrence carries no deletion evidence. Add tests for same-time logs, repeated imports, revisions, missing nutrients and backup round trips. Validate against a disposable local copy of the owner's backup without adding it to the checkout.

## Sleep and complete-file follow-up

Stage sleep spans by HealthKit UUID and preserve user-entered sleep. Treat connected spans from the same source as one session. Measure sleep from the union of recorded asleep intervals after removing overlapping awake intervals. Attribute the session to its local wake date and choose the longest measured window for that date. Keep other sessions from the same source available separately. Import steps, meals and sleep in a single transaction and roll the batch back if any of those streams is malformed.

Verify a real iPad export and a repeat import against a disposable restore of the owner's backup. Keep both files outside the repository.
