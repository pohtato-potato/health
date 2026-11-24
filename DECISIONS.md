# Health Bridge decisions

## Owner decisions

- Use the existing Health page layouts. Put Bridge controls under Settings → Backups and data.
- Connect the iPad and Health through Drive. Apply steps, meals and sleep. Keep existing manual values and allow the owner to override imported data.
- Attribute steps taken from midnight to 4 am to the previous Health day. The following day starts at 4 am.
- Keep settled Football results and Close snapshots. Keep private backups and day files out of source control.

## Implementation decisions

- The iPad uploads a rolling 14-day feed of steps, meals and sleep. Its direct Google Health sign-in and Drive sign-in have separate scopes and Keychain entries. Health uses the `drive.file` scope, with both OAuth clients registered in the same Google Cloud project.
- Health syncs while the tab is open and its Drive session is valid. The web access token lives in memory. Reopening or reloading starts a new session. Day files can also be imported offline through the same sheet.
- Hourly step buckets are deduplicated before summing. A step count is labelled Apple Health because a source name on an hourly bucket does not establish Fitbit exclusivity. A manual count can replace an imported count at any value.
- Sleep goes on the wake date. The existing Health log uses the measured start and wake times. Stage-derived sleep minutes are shown separately in the Bridge sheet. The user's rested answer stays part of the morning log.
- Bevel entries use upstream IDs. Imported rows have a labelled log time and an optional, separately entered eaten time. A similar manual entry within 90 minutes holds the Bevel entry for review. User edits and deletions are preserved on repeat imports.
- A local repair of a previously skipped window can update history. Import leaves completion flags, Close snapshots and stored matches alone.
