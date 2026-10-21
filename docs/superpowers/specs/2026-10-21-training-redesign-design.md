# Training redesign: the live session, Train, and the coach export

Date: 21 Oct 2026 · Branch: prototypes on `proto/session-refine` · Status: draft for the owner's review

This spec turns three rounds of scoping into one design for training: the live session, the Train tab, the finale, the coach's export and the plan file. The look comes from two working prototypes the owner approved (`#/proto/session` and `#/proto/train`), built in the app's own Dusk world rather than a new one.

**This repo is public.** Personal values (the plan, loads, injuries, setups) stay in the private plan file and starter file, and in the owner's shared Training folder outside the repo. Numbers below are examples.

## Sources

- The coach agent's *Training Module Redesign Brief* (R1–R12) and its export requirements.
- The owner's verdicts: the Train scoping form, the Train pinboard, and three prototype rounds (all recorded outside the repo in the shared Training folder's `decisions/`).
- An Impeccable critique of the current Train and session screens (28/40; saved in `.impeccable/critique/`, git-ignored).
- Deep dives on personal events and on collectible exercise cards (shared Training folder, `from-claude-code/`).

## Goals

1. **Measure what really happens in a session.** Lifting, rest and the time between are separate numbers. Sides, setup, tempo and form checks are recorded per set.
2. **Make the session fit the owner's real moment.** The phone sits on the bed, the owner reads with the Android magnifier, music plays in headphones, battery is often low. Every action mid-set works with one big target or a tap anywhere.
3. **Let quality drive progress.** Form is ticked against named checks, never typed as a 1–5 score. The burn and reps in reserve are logged when they happen.
4. **Keep celebration.** Records glow gold, the finale ends on the night's best moment, and themes reach the session.
5. **Hand the coach a weekly file** with everything above.

Non-goals: no streaks, no notifications, no extra credit beyond the weekly session target, nothing rewards eating less, data stays on the phone.

## Design language: living colour

The session and Train share one look: the app's Dusk palette and type (Fraunces numerals and titles, DM Sans for controls) on a **living background**. Four large soft lights drift slowly behind the content (the "aurora"), tinted by the state of the moment.

### Colour has jobs, in order of importance

| State | Colour | When |
|---|---|---|
| New record | gold, with a bloom (glow) | reps pass the best ever at this load |
| The burn | orange | after the owner holds to mark the burn |
| In range | green | reps reach the bottom of the plan's range |
| Building | white | below the range |
| Rest | blue | during rest |

- Gold outranks orange, orange outranks green. Gold is used **only** for records.
- The count, the ripple and the background all take the state's colour. A word under the count always says the state too ("in range", "in the burn", "new record · best was 16"), so colour never carries meaning alone.
- The check screen keeps the colour the set ended in. Rest starts in that colour and fades to blue as it runs down.

### Themes reach the session

Each app theme gives the tap ripple its own shape and the recap and rest rings their own three colours:

| Theme | Ripple shape | Rings |
|---|---|---|
| Dusk | circle | lavender, mint, coral |
| Diwali | marigold rosette | marigold, orange, magenta |
| Holi | powder splash | pink, green, blue |
| Moonlight | four-point sparkle | silver, sky, violet |
| Kanyakumari sunrise | sun | yellow, coral, violet |
| Retro | pixel square | green, yellow, red |

The three ring colours in every theme must be clearly different hues.

### Accessibility

- **Text size:** the app's standard scale. The owner uses the Android magnifier, so oversized type slows reading down. Larger text stays an option, off by default.
- **Targets:** 44 px at least; mid-set actions 56–60 px; the tap area is most of the screen.
- **Never colour alone:** every state has a word, every tag has text ("burn", "slipped", "record").
- **Stable positions:** things stay where the magnifier expects them across sets.
- **Motion:** all drift, ripples, bloom and dust stop under reduced motion. Battery saver (automatic below 30%) drops the aurora to true black and stills everything.
- **High contrast:** every colour comes from tokens, so the high-contrast option reaches it.

## The live session

A session moves between full screens. Navigation is the same on every in-session screen: a back chevron, the session name and clock, **Sets** and **Session** quick looks, and a strip of numbered exercise buttons for jumping in any order (supersets stay together).

### 1. Before

- The session name, its **usual length** (the owner's median for that session, not the plan's figure), the finish time, and the number of plate changes.
- **Leg check** (R8), before sessions with leg work: "Legs sore, 1–5?" At 4–5 every leg exercise drops to one set tonight (never skipped), and the plan shows "1 set" beside each.
- **Kit check:** chair and mat, collars, headphones, battery above 30%. Ticks are optional.
- **Warm-up** from the plan's warm-up text. Its light set is logged as `warmup` and never counts.
- **Tonight in load blocks** (R4): the exercises ordered by dumbbell load, with a "plates change" line at each change.
- Start.

### 2. Guide before an exercise's first set (R1)

Shown before the first set of each exercise in a session. It includes:
- the full guide (set up, move, feel, stop);
- the sets and range, the load, a side badge (R5) with the plan's reason ("the smaller left arm leads"), and "Tempo: lower 3 s, lift 1 s" when tempo is on;
- **Your setup** (R3), dated and editable ("Change my setup" starts a new version from today);
- the form checks the owner will tick after each set.

### 3. The set

- **Tap anywhere to count a rep.** Each tap sends a ripple in the theme's shape and the state's colour, with a short buzz.
- **Hold (about half a second) to mark the burn.** Reps after the mark count as "past the burn". Two-handed exercises use the same hold; the motion-sensor counter (below) is the later answer for when both hands are busy.
- **The set timer starts on the first tap and stops on Set done.** That gives lifting time per set; rest is timed separately; the gap between rest ending and the first tap is "between rest and lifting".
- **Tempo, woven in** (R11), when the plan sets it:
  - a ring around the count drains for the 3-second lowering after each tap, then refills on the 1-second lift;
  - a beat line steps 3 · 2 · 1 · lift;
  - the background dims while lowering.

  Each tap marks the top of a rep. Tempo starts in exactly the state the plan sets. An exercise without tempo shows none of this.
- **Sides** (R5): a coloured badge ("LEFT FIRST" filled when it's the lead side), and a large faint L or R in the top left of the tap area.
- **Weight lettering:** the load in large faint numerals in the top right ("5 kg").
- **Above the count:** the set number, the load and the side badge. **Below it:** aim and best, the state word, the hint ("Burn from rep 9 · 2 past it"), and "reps slowing" when the last two reps take 30% longer than the first three (rep speed as a fatigue signal).
- **Burn nudge** (R9): on isolation exercises, if the previous set of this exercise ended with 2+ reps in reserve, the set opens with "Last set ended with 2+ left. Go through the burn this time." Shown on the first side only.
- −1 and **Set done · n**.

### 4. The check

- Shown after Set done, in the set's colour, with the count and state word at the top.
- **Form checklist** (R2): the exercise's 3–6 checks from the plan. Tap once for "went well" (green ✓), twice for "slipped" (red ✕), a third time to clear. No 1–5 score anywhere.
- **Left in the tank:** 0, 1, 2, 3+.
- The previous set's answers come pre-highlighted, but nothing is saved until the owner taps. When nothing changed, the button reads **Same as last set**.
- **A set under 30% of last time asks "Real set, or skip?"** (already built).

### 5. Rest

- One screen: the time inside a ring that empties, in the theme's colour, while the background fades from the set's colour to blue.
- **Just now:** the last set as tags ("record", "burn from 9", "2 went well", "1 slipped").
- **Next:** the next set, load, aim, tempo, and the exercise's cue.
- **Adaptive rest:** the rest length per exercise follows the owner's data. It is longer when reps fall off across sets, shorter when they hold, and one plain line says why ("Rest is 1:30 here: your reps dropped from 18 to 15 across sets last time").
- **+ Note on this exercise**, kept for next time and the coach.
- +30 s and **Ready**. Ready starts the next set and the "between" timer ends at the first tap.
- **Per-side exercises get one rest after both sides.** The second side follows straight on from the first side's check.
- **Battery saver:** true black, no motion, the time and next set in readable grey, the screen kept on.

### 6. Plate change and collar check

- Shown when the load block changes: "Plates change", 10 → 5 kg, and which exercises the new load is for.
- **Collar check** (R12): before exercises marked `overFace`, "Collars tight on both handles" must be ticked to continue, once per session.

### 7. Record moment

When a set beats the best ever at its load: a full screen with the count in gold and a bloom, gold dust rising, the exercise and load, the old best and its date, and the song playing (Last.fm). **Keep going** leads to rest.

### 8. Finale

Seven pages, in this order.

1. **Anything to flag?** Joint flags and a note for the owner and the coach. Safety comes first.
2. **Records**, one card each, in gold, with the old best, what's next, and the song.
3. **Soundtrack**, on a violet aurora: the tracks with colour tiles, records marked, most played.
4. **Where the time went:** total, then lifting, resting and between, as a bar and three rows, plus the longest rest and how the time compares with the usual for this session.
5. **Form:** the share of checks that went well, check by check, the most common slip (which sets tomorrow's form focus), and left against right.
6. **Recap rings:** exercises done, sets in range and form checks, as three rings in the theme's colours, with the session quality score in the centre.
7. **Tonight's best**, last: the best record or first, in gold.

Each page tints the aurora: gold for records and the best, violet for music, blue for time, green for form.

### Quick looks

- **Sets:** this exercise, set by set: tonight against last time, with tags (record, burn, slipped) and the exercise note.
- **Session:** every exercise in load blocks with plate changes, the usual length and finish time.

## The Train tab

The same aurora, in two states.

- **Before a session:** the next session, its usual length, the number of plate changes, what's ready to go heavier, the day's form focus, and the **whole plan**, scrollable inside the card, grouped by load block with each plate change marked. Then Start, or the 30-minute version.
- **After a session:** the background turns gold if there were records. The card shows tonight's records, time lifting, quality, the next session, and Replay the finale.

Below, in both states:

1. **You, four weeks ago:** the same session then and now, exercise by exercise.
2. **This week on your body:** front and back figures coloured by hard sets against the plan's target per muscle group. Green is on target, yellow low, red high, with a legend and each count against its range. One plain line names the biggest gap. This needs an optional per-region colour on `BodyHeat` (built in the prototype).
3. **Records:** the latest three, gold. "All" opens the records wall.
4. **Your cards** (see below), one row, swipeable.
5. **This month so far:** sessions, records, the usual session length, and the most improved exercise. The full **monthly report** opens on the 1st.
6. **Recent sessions:** date, length (or "logged later"), sets and records.
7. **The plan:** name, sessions, version and date, then history and the warm-up.

## Exercise cards

Each exercise is a card: the constellation of its own pose (joints as stars, limbs as lines) on a star field seeded by the exercise. The tier changes the drawing.

| Tier | Earned when | Drawing |
|---|---|---|
| First light | the exercise is first logged | dim stars, no lines |
| Clean | every check went well on one full session of it | lines joined, mint |
| Even | left and right within one rep for a full session (per-side moves) or every check twice running (others) | blue, dashed links between the sides |
| Plated | a record at a new load step | silver, engraved ground |
| Mastery | every check across 10 sets running at the top of the range | gold, glowing, no frame |

- Tiers are earned and never lost. They count quality, never volume.
- Each card shows "Next:" with the exact step to the next tier.
- A card's back (tap to flip) shows the season's best sets, the strength curve and the exercise's records.
- Poses are drawn per exercise id. A new plan exercise without a pose uses the nearest movement pattern until one is added.
- The faint human figure at Mastery needs an illustrator and is deferred. The constellations ship without it.

## Data

### Plan file additions (all optional; older plans import unchanged)

| Field | On | Type | Used by |
|---|---|---|---|
| `guide.checks` | exercise | `{ id, text, kind: 'do' \| 'avoid' }[]`, 3–6 | form checklist |
| `setup` | exercise | string | default setup |
| `muscles` | exercise | muscle ids | weekly volume, body card |
| `isolation` | exercise | boolean | burn nudge |
| `overFace` | exercise | boolean | collar check |
| `leadWhy` | exercise | string | side badge reason |
| `oneSide` | exercise | boolean | per-side logging for one-arm moves |
| `weeklyTargets` | plan | `{ [muscle]: [lo, hi] }` | body card targets |
| `planVersion` | plan | string | export, plan history |

Import warns when a superset mixes loads, when an exercise has no guide or checks, and when a pose is missing.

### Set and session records

| Where | New fields |
|---|---|
| `SetEntry` | `startedAt`, `endedAt` (the set timer); `burnAt` (rep number); `checks: Record<checkId, 'ok' \| 'slip'>`; `sideOrder`; `setupVersion`; `warmup?: true` |
| `TrainingSession` | `legSoreness`; `plateChanges`; `collarCheckedAt`; `notes` per exercise; time split (`liftMs`, `restMs`, `betweenMs`) |
| `Settings` | `setups: { [exerciseId]: { from: DayKey; text: string }[] }`; `planHistory: { at; version; plan }[]` (replaces the 7-day undo); `cardTiers` (derived, cached) |

The 1–5 `form` field stays readable in old sets and is no longer written. Records count a set when no check slipped (the clean-reps rule, re-based on checks).

### Derived numbers

- **Usual length:** the median of the last 5 completed sessions of that session id, excluding logged-later sessions.
- **Adaptive rest:** start from the plan's rest. If reps fell by more than 20% from set 1 to the last set last time, add 15 s (up to +45 s). If they held within 10%, take 10 s off (down to −20 s).
- **Record:** reps greater than the best ever at this load for this exercise id, counting clean sets only.
- **Load blocks:** group consecutive exercises by load (from the plan and the equipment), and order the blocks to need the fewest plate changes. Supersets are never split; a superset that mixes loads is flagged at import.

## Coach export

Weekly, from the export screen. The export holds the brief's sheets and a small `training-week-YYYY-MM-DD.json` for the coach agent.

- **Sets sheet**, per set: exercise id and name, plan version, setup version, side and side order, load, reps or seconds, set start and end, reps in reserve, tempo on/off, burn rep, checks ticked, checks slipped, skipped or swapped (with reason), warm-up flag.
- **Sessions sheet**, per session: session id, extra or rotation, start and end, lifting, rest and between time, leg soreness, readiness inputs, plate changes, collar check, flags, notes.
- **Weekly volume sheet** (new): hard sets per muscle per week (reps in reserve 0–3, no drop or warm-up sets) beside the plan's targets.
- **Form sheet** (new): per exercise, the share of sets where each check went well, over the last 4 weeks.
- **Records sheet:** grouped by exercise id and setup version, with the best set at each load. Load is never ranked ahead of reps.
- **Plan sheet:** load blocks, lead side and reason, the setup text in force.

## Out of scope for this build (later list)

- Spoken cues, plate helper, race-your-last-time, rep timeline, reorder on the fly, clip comparison, training on the walk, chapters, Logbook postcards (all declined).
- Personal events and quests: the deep dive recommends Quests; they need their own design round.
- Motion rep counting (experiment), the form camera, try-it-for-two-weeks experiments, Training Wrapped, the V-taper view, the week planner, power songs, the shape forecast, Samsung Health import, the walk redesign, the new-kit flow, the pull-up path: kept for later rounds.

## Build order

Each part ships on its own and keeps `npm test` and `npm run build` passing.

1. **Session core:** the living background and colour states; the tap counter with burn, timer, tempo and sides; check; rest with one rest for both sides; battery saver; the new set and session fields.
2. **Session edges:** Before (leg check, kit check, warm-up, load blocks); the guide and setups; plate change and collar check; the record moment; quick looks; adaptive rest; usual length.
3. **Finale:** the seven pages, theme rings and tints.
4. **Train:** both states, four weeks ago, the body card with targets, records, the monthly strip, recent sessions, plan history.
5. **Cards:** tiers, constellation poses for every plan exercise, card backs.
6. **Plan file and export:** the new plan fields and import warnings, the coach sheets and the weekly JSON.

## Testing

- Domain logic test-first: colour state, the burn and tempo cycle, one rest per side pair, load-block ordering, adaptive rest, usual length, record by check, card tiers, the export rows.
- A design check at phone size of every screen in Dusk and one other theme, in battery saver, with reduced motion, and with high contrast on.
- One real session on the phone before each part is merged.

## Open questions for the owner

1. **Card tiers:** do the rules in the table feel right, especially Mastery (10 sets running, every check, at the top of the range)?
2. **Adaptive rest:** is ±15 s per step, capped at +45 s and −20 s, the right size of change?
3. **Monthly report:** a page on Train on the 1st, or a full-screen story like the finale?
4. **Plan history:** keep every plan version forever, or the last 10?
