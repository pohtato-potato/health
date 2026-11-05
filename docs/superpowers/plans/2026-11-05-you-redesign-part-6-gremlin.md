# You redesign, Part 6: Gremlin

**Spec:** section 4.6. **Overview:** `2026-11-05-you-redesign-overview.md`.

**Goal:** Gremlin is the only voice: 336 lines across 28 moments, warming with the journey and never admitting it. A switch quiets it.

- `src/domain/gremlin/lines.ts`: 28 moments, three stages of four lines each. Every existing Gremlin line is kept.
- `src/domain/gremlin/index.ts`: `gremlinLine(moment, seed, day, vars)`, `gremlinStage(day)` (stage two at day 30, three at day 120), `journeyDay`, `spokenLine(settings, today, moment, seed, vars)`, which returns nothing when the switch is off.
- `src/domain/voice.ts` keeps only the plain helpers: joint flags stay plain.
- Old backups holding another voice land on the Gremlin, since `Settings.voice` is no longer read.
- New homes: creatures on the night sky, stretches on the stretch page, reports on Reports, slow days on How's today, returns on You, corrections after saving. Backups arrive with Part 7.
- Tests: `tests/gremlin.test.ts`.
