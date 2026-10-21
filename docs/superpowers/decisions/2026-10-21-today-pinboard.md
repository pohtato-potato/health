# Today redesign: pinboard decisions

Date: 21 Oct 2026. Branch: `proto/today`. Follows the Train redesign
(`docs/superpowers/specs/2026-10-21-training-redesign-design.md`) and its living-colour look
(`src/styles/live.css`, `src/ui/live/Aurora.tsx`).

Design verdicts only. Nothing here is a spec yet: the spec comes after the prototype rounds.

## Round 1 (settled before the pinboard)

- Today is both the quick glance and the main logging page.
- Essential at a glance: walk scene, "Why today", season strip, banners, rings card, Next up, occasion card.
- Behind a tap: date, place and status; voice line; readiness; protein gap; Close the day.
- The ticker goes. The night screen goes.
- The aurora comes to Today and comes more alive at moments. The voice line becomes rarer and more special.

## Round 2: the pinboard (81 pins: 61 pinned, 11 maybe, 9 dropped)

### Shape of the page

- Pinned: everything at a glance on the first screen; one slot that changes with the moment;
  date, place and status inside the walk scene; one home for the behind-a-tap things; "Why today"
  and the season strip as one card; banners only when due, one at a time, in a fixed spot; reorder
  and hide cards with a long press.
- The day as a timeline: dropped (follow-up 1). Structured (vertical day with a now line): dropped.
  Rise (energy curve): dropped (follow-up 2).
- Things 3 "This Evening": not a separate section; the moment slot carries the evening (follow-up 9).
- The detail home is prototyped both ways, a pull-up drawer and a "Today in detail" page, as a
  switch (follow-up 15).
- Prototype page shapes: "Glance" (first screen only, rest in the detail home) and "Glance + log"
  (the same first screen, then logging below the fold).

### From the critique

- Fix: Today shows Train's warning when a session's numbers look unfinished, never a suspect number.
- Fix: the morning log reminder stays as a plain line until the log is done, not only before 14:00.
- Fix: the walk caption gets a darker band behind it. Small is fine, because the walk scene becomes
  tappable and opens full screen (new, from the owner's note).
- Fix: nine equal-weight cards. The owner wants a more varied, designed page, not just a reorder.
- Fix: Today comes alive (it is still while Train moves). Gold only where something was earned.
- Fix: remove the ticker and night-screen code and their design rules.
- Tap targets: every control reaches 44 px by growing its tap area, without changing how it looks
  (follow-up 4).
- Small text: fix only the worst offenders, the 11 px tab labels and the 12 px ring targets
  (follow-up 3). No general size change.
- Ring labels for colour-alone: dropped (the owner knows the layout).
- Sick-day voice rule: dropped; no special status rule for the voice (follow-up 14).

### Living colour

All pinned: the aurora follows the day (dawn to dusk to night) and the day's state; a ring closing
sends one ripple of its colour, with words; a perfect day blooms the sky; Close the day settles the
sky into a still night with a star for each thing done; theme days paint one small touch into the
sky; the walk scene loses its box and shares the page's sky; a training day tints Today with Train's
colours.

- A perfect day is a gold moment: it counts as the top achievement (follow-up 5).
- The walk scene's hills and sky take dawn, day, dusk and night tints (Firewatch, Alto's Odyssey;
  follow-up 6), kept subtle.
- Apple Weather ("the page is the weather") is covered by the day-following aurora and Endel; not
  built on its own (follow-up 7).

### Logging

- Pinned: usual foods for this meal, one tap each; Log anything right on Today; the meal strip;
  Same as yesterday; the checklist as tick chips; steps typed on the rings card.
- Quick foods add the portion the owner usually eats of that food at that meal, learned from
  history, not the food's default portion. Undo or the toast changes it (follow-up 12).
- Dropped: the evening sweep (Close the day already shows the whole day on one screen), the morning
  card (the morning log stays the pop-up it is), voice logging.

### Training

All pinned: Next up in the Train look; this week's sessions as dots; tonight's records in gold on
Today until midnight; readiness as a word on Next up.

### Rings card

- The rings become the large headline (Bevel), percentages only. A second variant adds named stages
  ("halfway", "nearly", "closed") as in Zero. Both are prototyped as a switch (follow-up 8).

### Celebrations and moments

All pinned: the voice speaks only at moments; walk arrivals open full screen; the morning after a
perfect day replays it; Monday's story; the month's film on the 1st; a closed day becomes a
postcard; a gallery of moments; milestones; rare surprises; a chime and a buzz when a ring closes.

- The chime must be pleasant and satisfying, and distinct from the rest-timer sound.
- The morning reveal (Pokémon Sleep) plays right after the morning log is saved (follow-up 11).
- The full-screen walk shows the scene large, with the caption, the distance and the next place
  (follow-up 13).

### Cut or keep

- The night version of Today goes. The occasion card shows only near an occasion or in occasion mode.

### Features from other apps

- Pinned: Flighty's flipping numbers, Endel, Rive, Feltron, Apple Fitness ring close, Smart Stack,
  Oura, Gentler Streak, MacroFactor, Streaks' press and hold, Duolingo's end celebration, Headspace,
  Carrot's rare personality, Strava, Pokémon Sleep, Finch, Apple's limited-edition awards, Day One's
  "On this day", Pixel's At a Glance line, Animal Crossing's morning announcement.
- Dropped: Flighty's live card, Structured, Spotify daylist (follow-up 10), Rise.
- Maybes resolved above: Firewatch and Alto (yes, as tints), Bevel (yes), Zero (variant), Things 3
  (no), Apple Weather (covered), daylist (no), Rise (no).

## Prototype rounds

### Round 1

Prototype at `#/proto/today` (sample data only). Dev strip: time of day (morning, afternoon,
evening, after close), moments (ring closed, perfect day, record night, walk arrival, theme day,
sick day), shape (Glance, Glance + log), rings (headline, headline + stages), detail home (drawer,
page). Feedback pending.
