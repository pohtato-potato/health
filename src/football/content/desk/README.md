# Step 4 content: the desk and the world

Words and data for the desk, the cast, the fogged world, the loan market's scouting, the congress and the coaching course (spec `2026-11-12-desk-and-world-spec.md`, sections 3–9). Typed data only: nothing here runs a rule. `index.ts` re-exports every file; it is **not** re-exported from `content/index.ts`, so import from `src/football/content/desk`.

Tests: `tests/football/desk-content.test.ts` checks every club is covered, every job × axis × band is voiced, ten ranks per cast member, motions and leans are valid, every question has exactly one answer, and the standing rules (no gendered pronouns, UK spelling, no shaming, no eating-less, no religious framing, betting or alcohol, no generic gym lines).

| File | What | Count | Read by |
|---|---|---|---|
| `types.ts` | All shapes, plus `DESK_JOBS`, `BANDS`, `bandOfDie` | | every fork |
| `cast.ts` | `CAST`: the four staff plus three new faces; who, what habit they care about, warm and cool greetings and parcel lines, asks, ten rank scenes with perks at some ranks | 7 members, 70 scenes, 25 perks, 14 asks | Fork 4 (bonds, the cast job), Fork B's parcel seam, cup runs |
| `voices.ts` | `VOICES[job][axis][band]`: two lines per cell | 10 jobs × 6 axes × 3 bands × 2 = 360 lines | Fork 1 (spending a die) |
| `lore.ts` | `CLUB_LORE[clubId]`: invented manager, history, a scout's tease of the hidden ability, and `hiddenNew` where the data has no hidden ability | 107 league clubs (all but Brabo, old selves included) + 31 abroad = 138 | Fork 2 (fogged club pages) |
| `owners.ts` | `OWNER_KINDS`, `REGIONS`, `SEATS[clubId]` | 10 kinds, 28 regions, 108 seats | Fork 4 (congress) |
| `motions.ts` | `MOTIONS`: text, how it plays, a keyed twist, leans by owner kind and region, back-page lines | 20 | Fork 4 (congress) |
| `paper.ts` | `COLUMN_LINES` by aim, with a headline; `FAN_MAIL` with replies | 36 lines, 16 letters | Fork 1 (column job) |
| `scouting.ts` | `SCOUT_REPORT` by finding, `DIVISION_REPORTS`, `STILL_HIDDEN`, `SCOUT_THIN` | 27 + 4 + 3 + 3 | Fork 2 (scout reports) |
| `cat.ts` | `CAT_SETS` (passages, puzzles, tables) and `CAT_QUESTIONS` | 11 sets, 100 questions (40 quant, 24 verbal, 18 LR, 18 DI; 39 TITA) | Fork 1 (coaching course), step 5 (daily question) |

## Notes for the forks

- **Voices.** `bandOfDie(die)` picks the band. Pick two axes per die and one line from each cell; fill `{value}` with the dice tile's reason ("16,400 steps"). Every line starts with the axis name and a colon, so the screen can style it.
- **Cast perks.** `PerkKey` is documented in `types.ts`; each is one rule for Fork 4 to wire. None touches a rating or a match's odds. `clock-head-start` carries a `job`; `heirloom` carries an `item` id for three new heirlooms (`tape-gun`, `tape-1987`, `radio-scarf`) whose rule is in the perk's text: they need adding to `cup/heirlooms.ts`. `meal-card` is a new cup card (Kemal's lentil soup) for the cup pool.
- **Asks.** Each `CastAsk.trigger` uses a `Metric` from `content/types.ts` and is always one of that member's `cares.metrics`. Meeting it brings bond points; missing it costs nothing.
- **Cool tone.** `greet.cool` and `parcel.cool` are for a low opinion. They are shorter and plainer, never unkind.
- **Hidden abilities.** Clubs that already have `hidden` in league.json (invented clubs and old selves) get only a `hiddenTease`. Real clubs and clubs abroad get `hiddenNew`, the same shape as `ClubDef.hidden`, whose `fx.when` is always one the engine already reads in league.json, and whose mods press one axis by 1 or 2.
- **Managers** are invented, even at real clubs.
- **Seats.** Old selves have the owner kind `old-self` and region `memory`; give them a neutral lean unless a motion names them.
- **Motions.** `twist.key` is unique per motion; `plays` is the exact rule. Missing owner kinds lean 0. Every motion has clubs leaning both ways.
- **Coaching course.** `mcq` answers are an option index (0–3); `tita` answers are the exact digits to type (para jumbles are a sequence like `2413`, compare as strings). Set questions name their `set`; show the set's text above the question (tables are Markdown). Imported past-paper questions (spec §13) use the same `CatQuestion` shape, on the phone only.
