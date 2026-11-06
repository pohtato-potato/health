# Football tab: design spec

6 Nov 2026 · Branch `feat/football` (cut from `main` at d114ff5) · Status: draft for the owner's review.

The repo is public: this spec holds no names, body numbers, plans, loads or medical details. Every number in the mockups is made up. Personal values (step goal, calorie budget, protein target, sleep target, the coach's exercises) are read from the owner's own settings at run time and never written into code, tests or this file.

**The look is the pinboards.** Football had no in-app prototype round. The owner chose thirteen pinboards instead, and the drawn screens are the reference. Built screens are checked side by side against them at 360 px (`feedback-check-against-prototype`).

| Board | Link | What it settled |
|---|---|---|
| 7 | https://claude.ai/artifact/9YVPJNNtmLa28rxUtycsLz | The aurora outline direction |
| 8 | https://claude.ai/artifact/JhpqpsbqhhiShQ3T4pd4fo | Shockwaves, saves, awakening, Tonight, half-time, full time, squad, promotion, cup |
| 9 | https://claude.ai/artifact/Ag3YmP6zeoUXvA73NHeues | The club, league, kits and ground in light |
| 10 | https://claude.ai/artifact/QgJGFAbyF7pFWhPbJsX5UZ | Calendar, pyramid, bracket, club page, grounds, home, promotion, money, squad life |
| 11 | https://claude.ai/artifact/HrAo2Rx4HT7iRWtGEzEKXa | Crest kit, events, World Cup, quarter map |
| 12 | https://claude.ai/artifact/4BsS7KwpL2nDG5ybekwJ74 | Old Selves, rivals, special nights, Season Wrapped, settings |
| 13 | https://claude.ai/artifact/BUUUiFQ1N8mEFUrnf95JAS | The cast redrawn, the funny press conference, rivals; how Football fits Health; the page map; workflows |

Mockup sources (outside the repo): `Football shared/mockups/` (`b5_engine.js` is the working match toy; `b9`–`b13` mocks and CSS hold every drawn screen). The engine toy and the CSS are the starting point for the real code.

## Sources

- Decision logs (outside the repo, in `Football shared/decisions/`): pinboard 1, round 2, round 3, pinboards 2 and 3 to 13 (`2026-11-06-football-pinboard-3-answers.md` carries boards 3 to 13), the league design (`2026-11-06-football-league-design.md`, approved), the kit, crest and stadium design, and the league chat's rounds 1 to 4.
- League data: `Football shared/league/build_league.py`, which writes `league.json` and `league.md` (108 clubs, quirks, styles, youth pool, contracts, money, world events).
- Where these differ, the latest answer wins and is written here. Section 16 lists every place an older source is overruled.

## 1. Goals and non-goals

Football is the owner's health life told as football: the fun part of the app. Each day's logged habits become tonight's match for a made-up club, Brabo United, which starts at the bottom of a six-tier European pyramid and climbs.

**Goals**
- A match every night, played from the day's real data, with honest dice. Upsets are remembered, not smoothed away.
- A world that moves without you: 108 clubs, cups, events, news and lore that grow over seasons.
- The football-manager loop (squad, contracts, youth, transfers, money, kits, crest and ground) built only from data the owner already logs.
- Football never asks for an extra log, never edits a habit, and never rewards eating less.
- More life than any tab so far: strong aurora, glowing outlines, motion everywhere.

**Non-goals**
- Real football: no real fixtures, results or news (dropped on board 13).
- Sound. Haptics only.
- Reminders or notifications (board 13: everything waits on Today).
- An in-app kit creator (kits are a drawn catalogue).
- Ball skills, walking football or anything played physically.
- The dropped ideas: treatment room, kit bag, team talk, chips, sticker album, match programme, away end, late kick-off bill, half-time routine, match log, crowd and stadium sound, Grounds of India, heat map, tactics board, the 90-minute day clock on Today.

## 2. Design language: aurora outline

- **World.** Health's aurora, strong (board 7, option B), tinted by club colours. Brabo United is orange `#ff7a1a`, purple `#6c3fc4` and black. When the opponent attacks, the aurora shifts to their colour. No navy cards and no glass (`feedback-football-look`).
- **Lines.** Minimal glowing outlines are the main design element (Endel). Bold lines for anything meaningful and thin lines for decoration (board 8 t-line C).
- **Type.** Fraunces Light for big numbers (board 8 t-num A), DM Sans for text, Barlow Condensed for shirt numbers, minutes and headlines.
- **Colour has jobs.** Each colour is always paired with a letter, a shape or a word.
  - **Results:** W green `#5fd38a`, D yellow `#ffd34d`, L red `#ff6464`, with the letter inside. Everywhere.
  - **Fixture shapes:** circle for the league, diamond for the Big Cup, square for a trophy, hexagon for an event night. Finals are gold-filled.
  - **Tier borders:**
    - Crown League `#e7d7ff`
    - Division Two `#a98bff`
    - Division Three `#6fb8ff`
    - Division Four `#4fd1c5`
    - Division Five `#9fd8a8`
    - Division Six `#ffa25c`
    
    They glow and pulse.
  - **Ratings:** coloured by the gap to yours, pulsing.
  - **Axes:** Pace `#6fb8ff`, Power `#ff8a5c`, Fuel `#ffd36b`, Rest `#b49bff`, Routine `#4fd1c5`, Shape `#ff7ab8`.
  - **FM bands on the 1–20 scale:** 1–5, 6–10, 11–15, 16–20, as in board 8. Every attribute number carries its band colour.
  - **Gold:** only for records, finals and trophies (the Health rule). The one-night patch is cream, not gold.
  - **Other clubs:** every club has its own colour, and its name is coloured wherever it appears.
- **The data kit** keeps orange, purple and black: orange a win, purple a draw, hatched black a loss.
- **Motion.** Everything moves: the breathing radar in two glow layers (board 12), shockwave goals that cycle through five kinds and hit different spots, the glove save that deflects the ball where it actually is, the goal-line zoom, ability banners, the awakening that stretches one axis only, level-up traces and pulsing tier colours. No battery-saver or reduced-motion modes (`feedback-no-battery-saver`).
- **Accessibility floor** (as in every Health tab, measured at 360 px):
  - nothing meaningful under 14 px
  - targets at least 44 px
  - never colour alone
  - no text collisions and no horizontal scroll
  - big numbers fit at 360 px
  
  Kits and crests have extra rules:
  - every kit's main colour reaches 3:1 against the night ground, or it gets a light outline
  - home, away and third differ by pattern as well as colour
  - every crest has a thick-shape small version for 24–32 px, always shown with the club's short code
- **Nothing religious, astrological or India-coded.** The world is European.

## 3. How Football sits in Health

### 3.1 The tab bar (board 13, A)
Today · Train · **Football** · Walk · You. Football takes the centre slot: a round crest mark with Brabo's orange ring and a slow glow, labelled "Football". The plus leaves the bar:
- **On Today,** it sits as a 56 px round button beside the drawer handle, in one row with it, so the two never overlap.
- **On every other tab,** it floats in the same bottom-right corner above the bar.

It still opens the log sheet. Tapping the Football tab while on Football returns to the Football home and scrolls to the top, like every tab.

### 3.2 Who owns what (board 13, pinned)
- **Health's tabs own every habit.** Today owns food, checklist, medicines, nights out and sleep; Train owns sessions; Walk owns steps; You owns body logs and day status.
- **Football only reads,** once, when the day is closed (or at 4 am). It owns matches, the league, clubs, the squad's football state, kits, crests, the ground, money, news and the cast's lines.
- **Football never writes to a habit.** Removing Football leaves Health exactly as it was.

### 3.3 Touchpoints in other tabs (board 13, pinned)
- **Today: one Football card, never more.** It is the only aurora card on Today, and it changes through the day:
  - **Morning:** last night's match, sealed (no score) until watched. Tap to watch.
  - **From 6 pm:** half-time. A small radar of tonight's shape so far, tonight's opponent, the weakest axis so far, and what the opponent presses on. This is the only time-of-day rule in Football. It changes what the card shows, never the match.
  - **Evening:** "Closing the day kicks off the match. Or it plays itself at 4 am."
- **Close the day:** the last screen becomes the kick-off card: the two crests, the fixture, **Watch now** and **Later**. Later keeps the match sealed, and Today shows it in the morning. The axes are fixed at this moment.
- **Train, Walk and You: one small line each,** never a card. Tapping a line opens Football on Tonight.
  - Train, on Session done: "Power 12 → 15 for tonight".
  - Walk: "Pace 14 · 2,000 more steps makes it 15".
  - You's momentum chart gets a thin league-position line.
  - You's Monday recap gets one line: "This week: 3 won, 2 drawn, 2 lost. Up to 4th."
- **No reminders.** Health has no notifications.
- **Haptics:** goals, saves and conceded goals buzz when "Buzz on goals" is on.

### 3.4 Shelf, backup and export (board 13)
- **Shelf:** nothing for now (owner, 6 Nov). The match line on Health's day card for Logbook comes later (section 13).
- **Backup:** the full backup file carries every Football store.
- **Export:** the spreadsheet export gets one Matches sheet: date, season, matchday, competition, opponent, home or away, score, result, and the six axis values.

## 4. The map (board 13 page map, home B)

The Football home has four tabs along the top: **Tonight · Club · League · Story**. Cups and events live inside League. There are two levels, never more. Every page has a back arrow to its parent, and tapping the Football tab again always comes home. Hash routes start `#/football`.

| Tab | Pages |
|---|---|
| Tonight (`#/football`) | tonight's fixture and shape; the match (`/match`); full time; the studio; the press conference; catch-up reel |
| Club (`/football/club`) | squad and armband; a player (`/player?ax=`); contracts, youth and transfers; budget and offers; kits and the kit wall; crest history; the ground and the Kaai quarter |
| League (`/football/league`) | table; pyramid; calendar; any club's page (`/club?id=`); news and the back page; wiki; Big Cup and the other cups (`/cups`); event nights; the World Cup |
| Story (`/football/story`) | rivals; seasons and Season Wrapped; moments; Old Selves; settings |

Full-screen moments (they open over anything and close back to where they started): goal takeovers, level up, promotion or relegation, a new division, launch day, opening night, a rival is born, awakening, Season Wrapped and the first run.

## 5. Screens

Each screen is drawn on the board named beside it.

### 5.1 Tonight (boards 8, 9, 13)
- **Top:** matchday and competition ("Matchday 19 of 42"), then both crests with the opponent's colour.
- **Tonight's radar:** the shape so far, breathing, with the six axes in the centre. Your value is on the left, the opponent's pull on the right.
- **The opponent's known abilities.** A hidden one shows as "One ability, found out after you first play them".
- **Your live state:**
  - the armband's [C]
  - this week's stack
  - a knock or a card
  - the next cup or event night
- **After the match:** Tonight shows the result card, the studio and the press conference until 4 am.

### 5.2 The match (boards 4, 5, 8, 9, 10, 12)
The engine (section 7) runs on one radar. Each chance plays in slow phases:
1. The phase changes: the background turns to the attacking side's colour, and defending looks clearly different.
2. Modifiers play one by one, with big ± numbers, a ghost outline of the old shape and the axis label popping.
3. The chance percentage settles.
4. The ball flies with a trail showing bounces and spin.
5. Close calls get the goal-line zoom, "IN by 4 mm" or "OUT by 4 mm".
6. The result plays:
   - **Goal:** a shockwave cycling through rings, hex wave, net wave, ray burst and colour shards, at different spots.
   - **Save:** the glove trail, landing on the ball and deflecting it.
   - **Big goals:** a full takeover for screamers, cup finals, derbies, last days, and promotion or relegation goals.

Then:
- **Ability banners** say which ability fired and whether another chance is coming. A hidden opponent ability announces itself without naming itself.
- **The feed** gets one commentary line per chance.
- **Length:** up to 3 minutes, longest on big nights. **Skip to full time** is always there; it jumps to the stored end state.
- **Bookends:** the ground appears for two seconds at kick-off, erupts on home goals, and shows a crowd and gate line at full time. It is never on screen during play.

### 5.3 Full time, the studio and the press conference (boards 8, 12, 13)
- **Full time:**
  - the score and xG
  - the moments kept for the season's story
  - an opponent's hidden ability, now found out
  - the table change
- **The studio:** the gremlin (small and spiky, in a Brabo scarf, grins and blinks, orange) and the pundit (glasses, headset, tie, purple) argue in three lines.
- **The press conference:** optional, one tap. A journalist asks a funny question about the night, with three answers that are all jokes and none of them right. Whichever you pick becomes tomorrow's back-page headline, and the gremlin reviews it. The question and answer bank must never be mundane.

### 5.4 Club tab (boards 8, 9, 10, 11)
- **Squad:** six squad members on a pitch, three attacking and three defending, as rings in FM band colours.
  - A dashed ring is a knock; the armband shows [C].
  - Each member is a habit: Steps (Pace), Training (Power), Food (Fuel), Sleep (Rest), Checklist (Routine) and Body logs (Shape).
  - The owner is player-manager, shirt 42.
  - Promoted youngsters join the bench.
- **A player:** FM-style attribute page with no legend.
  - The tier-relative rating out of 20, with the real value beside it ("the real word beside the football word").
  - Form, the contract line and traits.
  - The awakening history.
- **Contracts, youth and transfers:** one line per member, with the renewal tap. Youth intake cards. The trade-a-habit flow.
- **Budget and offers:** the transfer budget, income lines and sponsor offers. Each offer shows its risk, as stable, flashy or dodgy.
- **Kits:**
  - Launch day: in the days before each season, the kit maker offers several designs per slot, and you pick.
  - The kit wall, by season. Tapping a kit shows both its record and its throwback.
  - The data kit, the anniversary kit (every fifth season) and the one-night patch.
- **Crest history:** each step and the option picked.
- **Ground:**
  - The tenancy at Stadion aan de Stroom, then Kaai 42.
  - A top-down map of the Kaai quarter that develops over time (board 11).
  - Sealed bundles: only what exists, plus the next project's name and a teasing line.
  - Opening night draws a new stand in light for the first time.

### 5.5 League tab (boards 9, 10, 11)
- **Table:** 18 clubs with tier border, form shapes and points. Tap any club to open its page; its quirk stays hidden until you've met them. A cut line marks the top two and the playoff places.
- **Pyramid:** six tiers in their colours, with ratings coloured by the gap to yours, pulsing.
- **Calendar:** 42 days in fixture shapes. Played days show the result colour and letter. Days still to come are outlined. Event nights are hexagons.
- **A club's page:**
  - crest, colours, ground, style and known abilities
  - the hidden quirk once revealed, with [data] if it reads your data
  - the head-to-head
  - a short news feed
  - the club's wiki link
- **Grounds:** most clubs share their tier's ground shape. Rivals, the biggest clubs and a random handful get their own. Cup finals are at a neutral ground.
- **News and the back page:** one headline a day, a weekly roundup, and club news feeds; big stories reach the back page. It must never feel repetitive: section 8.10 sets the rules.
- **Cups:** the Big Cup as a list of rounds, then a bracket from the last 16 in each club's colours (the winner carries its colour forward). The whole bracket appears after the final. The League Cup, the Lower Divisions Trophy and the Underdog Shield work the same way.
- **Events and the World Cup:**
  - A group of three is settled in two days, one row per day: label, result in words, then the circle.
  - Then one knockout round a day.
  - Also: the giant-killings rundown, and the call-up line through the season.

### 5.6 Story tab (boards 12, 13)
- **Rivals:** Antigoon FC (the legend) plus up to three earned rivals, each with how it started and its rivalry modifier (section 8.7). Each rival has its own page: record, a list of meetings and moments.
- **Seasons:** each season's finish, cups, kit and crest, and its Season Wrapped.
- **Moments:** upsets against you and for you, and the moment of each season.
- **Old Selves:** each Old Self's page (crest from the kit of parts, a nickname from the month, that month's real radar) and the Old Selves Cup.
- **Settings,** five rows only:
  - match times (fixed, see section 7.1; shown for information)
  - which habit plays which axis (fixed mapping, shown; there is no editor yet)
  - buzz on goals
  - World Cup country
  - your own sponsor (type a name, pick a slot)

### 5.7 Big moments (boards 8, 9, 10, 12)
- **Club level up:** in the Pocket League style, it comes with the promotion that unlocks a crest step.
  - The old crest dims, light traces the new one, and one line says what changed.
  - You pick from five options, or keep the current crest from step 2 on.
  - More fans arrive at the gate.
- **Promotion and relegation:** each has a full screen with names. The playoff final has its own screen.
- **The new division:** the "your ratings in the new league" page shows each attribute dropping, with room to grow again.
- **Other moments:**
  - launch day
  - opening night
  - moving day
  - a rival is born
  - awakening: one axis stretches, its label turns gold, and its count and trait change
- **Season Wrapped:** five cards to swipe: the season, your best axis, the moments, the gremlin's verdict, and what's next.

### 5.8 First run (board 13)
About two minutes. Every step can be skipped except the shirt:
1. **Arrival:** a short story about a new club in Antwerp at a borrowed ground on the Kaai.
2. **The crest:** the landlords lend you theirs (step 1).
3. **The shirt:** pick one of the kit maker's offers.
4. **Your squad:** the habit-to-axis mapping, shown and explained.
5. **Old Selves:** your past months become clubs in the league, from day one.
6. **Tonight:** your first fixture. Close the day to kick off.

Season 1 starts on the day the club is founded.

### 5.9 Catch-up (board 13)
After days away, Tonight opens with "3 while you were away". You can watch them as one reel (key chances only) or just see the results.

## 6. Axis values

### 6.1 The mapping (board 13, confirmed)
| Axis | Side | Reads | From |
|---|---|---|---|
| Pace | attack | the day's steps | Walk |
| Power | attack | training: a session done, or a planned rest day kept | Train |
| Fuel | attack | calories inside the day's range, and protein against target | Today |
| Rest | defence | last night's sleep hours and the 1–5 rested rating | Today |
| Routine | defence | the share of today's checklist slots ticked, medicines excluded | Today |
| Shape | defence | body logs in the last 7 days (weigh-ins, the waist) | You |

Some data plays a different part:
- **Medicines are the physio** (section 8.3).
- **A night out is a yellow card** (section 8.3).
- **Never used:** water, and the time anything was logged or the day was closed.
- **The food rule:** nothing ever scores higher for eating less. Below the calorie floor always scores lower than inside the range.

### 6.2 Benchmarks: the real value, 1–20
Each axis turns the day into a **real value from 1 to 20**, set against realistic human ranges rather than the owner's own history. A very good real day reaches 18–20; going beyond that buys almost nothing (owner, board 13: 18–20k steps is already elite). Between points, values are linear. The table below is provisional. Part 1 begins with a separate research pass, as the owner suggested, that checks each row against published ranges and records its sources in the plan; the tests then pin whatever it settles.

- **Pace (steps):**

  | Steps | 0 | 2k | 4k | 6k | 8k | 10k | 12k | 15k | 18k | 20k+ |
  |---|---|---|---|---|---|---|---|---|---|---|
  | Value | 1 | 3 | 5 | 8 | 10 | 12 | 14 | 16 | 19 | 20 |

- **Power:**

  | Training day | Value |
  |---|---|
  | planned session done | 16 |
  | extra unplanned session done | 18 (extra effort counts in the match, as the owner asked, but only by 2) |
  | short session | 11 |
  | planned rest day kept | 13 |
  | planned session missed | 4 |

- **Fuel:** `round(20 × (0.5 × cal + 0.5 × prot))`, clamped to 1–20.

  | Calories | `cal` |
  |---|---|
  | inside the range | 1.0 |
  | up to 10% over | 0.6 |
  | below the floor | 0.4 |
  | more than 10% over | 0.2 |

  `prot` is `min(1, protein ÷ target)`.
- **Rest:**

  | Sleep hours | <5 | 5 | 6 | 7 | 7.5 | 8 | 8.5+ |
  |---|---|---|---|---|---|---|---|
  | Value | 4 | 6 | 9 | 13 | 15 | 17 | 18 |

  Then the rested rating adds −2, −1, 0, +1 or +2 for 1 to 5. Clamped to 1–20.
- **Routine:**

  | Share of checklist slots ticked | 0% | 50% | 80% | 100% |
  |---|---|---|---|---|
  | Value | 3 | 10 | 15 | 19 |

- **Shape:** 6, plus 1.5 per weigh-in in the last 7 days (up to 5 counted), plus 3 if the waist was logged in the last 7 days, plus 2 if the 28-day trend moves toward your own goal. Clamped to 1–20.
- **Not logged that day:** the axis plays at 5 and shows "not logged".
- **The first 7 days:** an axis with under 7 days of history plays at 10 and shows "no data" (board 13 edge flow).

### 6.3 What the screens show
- **The match radar** shows the real values, so the shape is your real day.
- **The player page and the "new league" page** show the tier-relative rating:

  `shown = clamp(round(10 + 2 × (real − A(tier))), 1, 20)`

  | Tier | Six | Five | Four | Three | Two | Crown |
  |---|---|---|---|---|---|---|
  | A(tier) | 7 | 9 | 11 | 13 | 15.5 | 18 |

  So promotion drops the shown rating by about 4 points low in the pyramid and 5 near the top (league design §3), and the real value always sits beside it.
- **Cup ties** show ratings against the opponent's tier.

## 7. The match engine (exact rules)

### 7.1 When it plays
- Closing the day kicks off that day's match.
- A day not closed by 4 am auto-plays at 4 am, or on the next app open after 4 am, and waits sealed.
- One match a night. Double-headers play two matches from one night's data (early cup rounds, the continental league phase, World Cup group day 1).

### 7.2 Determinism and honesty
- At kick-off the engine reads the six real values and every modifier.
- It draws every random number from a seeded generator (seed = date + both clubs' ids) and stores the full event list: chance minutes, types, modifiers, landing points and results.
- The animation replays the stored events. Watching, skipping and catch-up all show the same match.
- **Late logs never change a played match** (board 13, A). The dice stay honest. No hidden help, floor or ceiling.

### 7.3 The radar and the chances
- **Shape:** six axes, radius = value ÷ 20. The axes on the active side are lit at full length; the others are dimmed to 0.7 (attacking) or 0.75 (defending), clamped to 0.03–1.
- **Number of chances:** `total = clamp(5 + floor((attack average − 10) ÷ 4) + coin, 5, 8)`, where the coin is 0 or 1.
- **Your chances:** `clamp(round(total × (0.5 + (attack average − 13) ÷ 30 − (reach − 0.75))), 2, total − 2)`. The opponent gets the rest.
- **When they happen:** at random distinct minutes between 3 and 89, in random order.
- **Chance types** each give +2 to one axis:

  | Side | Type | Boosts |
  |---|---|---|
  | Attack | counter-attack | Pace |
  | Attack | set piece | Power |
  | Attack | through ball | Fuel |
  | Attack | long shot | nothing |
  | Defence | cross | Rest |
  | Defence | corner | Routine |
  | Defence | break through the middle | Shape |
  | Defence | long-range effort | nothing |

- **Modifiers, in order:**
  1. chance type
  2. captain
  3. youth sub (from 60')
  4. the opponent's shrinks (from league data)
  5. hidden or rivalry abilities
  6. late tiredness: from 75', −1 on each lit axis unless Rest is 15 or more
  7. the weekly stack
  
  Each modifier changes one axis value, clamped to 1–20.
- **Attack:** the ball lands uniformly anywhere in the full radar. Inside your modified shape is a goal.
- **Defence:** the ball lands uniformly inside the opponent's reach, a regular hexagon of radius `reach`. Inside your shape is a save.
- **The chance percentage shown** is the area of your shape over the landing region.
- **Goal-line check:** when the landing point is within 7 units of your shape's edge, the view zooms in and shows the distance in mm. It changes nothing, it only shows.
- **Moments kept for the season's story:**
  - a goal at 20% or less (SCREAMER, which gets the full takeover)
  - a miss at 70% or more (HEARTBREAK)
  - a save at 25% or less (WONDER SAVE)
  - conceding with 70% or more to save
- **Hidden abilities:** found out at full time of the first meeting.

### 7.4 Opponents
- From league data:
  - `reach = 0.40 + 0.005 × rating`
  - modifier budget = `(rating − 30) × 0.14`, split between shrinking your attack and pressing your defence by the club's style
  - each club's known and hidden abilities
- Part 1 tunes these against the target odds with a simulation test of 10,000 matches per case, using typical real values for each tier:

  | Case | Target |
  |---|---|
  | One tier apart, the weaker side wins | 28–38% |
  | Division Six against an elite club, the Division Six side wins | 1–3% |
  | An elite club in its own tier loses | 9–16% |

### 7.5 Other clubs' matches
Every night all 108 clubs play. Matches without Brabo are resolved from ratings, home advantage and world events: each side's goals are drawn from a Poisson distribution whose mean comes from the rating gap, tuned so a tier's table spreads like a real league. They are worked out at the same moment as your match and stored.

## 8. Club rules

### 8.1 Abilities
- **Ability slots** (pinned on board 2): up to 3 equipped abilities, chosen on the squad page.
- **Abilities are earned from moments and named after them** (owner's TTRPG taste). For example, the first screamer earns "Smash and Grab": once a match, a long shot gets +2 Power. Part 1 writes the catalogue (at least 12 abilities) from moment templates.
- **Built-in abilities:**
  - Captain's armband: +2 to the captain's axis on its side.
  - Second wind: once a match, a missed attacking chance of 30% or more is retaken.
  - Youth sub: from 60', +2 or +3 to a weak axis on its side.
  - The weekly stack.
- **The weekly stack:** abilities earned within a week add +1, +0.75, +0.5 or +0.25 to each attacking axis. The stack only grows while it lifts the chance by 15 points or less (the cap), and it resets on Monday.
- **Awakening:** when an axis's 28-day average first reaches a new band (11, 16 or 18), it awakens. Only that axis stretches, its label turns gold, it gains a named trait (+1 on its own chance type), and its career count goes up by one.

### 8.2 Armband rotation
- Pick a captain each week.
- If four different captains lead in four weeks running, the squad earns "Harmony": +1 on every axis for the next match.
- Keeping the same captain two weeks running restarts the count.

### 8.3 Physio and discipline
- **Medicines are the physio.** All of the day's medicines ticked keeps the squad fit.
  - One missed day: a one-match knock, −2 Rest in the next match.
  - Two missed days in a row: an injury, −4 Rest for two matches.
  - With the physio room built, an injury needs three missed days.
- **Drinks are discipline.** A logged night out is a yellow card. Two yellow cards within 14 days make a red: Rest plays at half its value in the next match.

### 8.4 Day statuses (board 13 notes)
- **Travelling:** nothing changes; half the matches are away anyway.
- **Sick, injured, a break or an occasion:** the rotated squad and youth play. The match counts for points, but plays from a rotation shape: your 28-day median on each axis, minus 2, instead of the day's data. The report says "Rotation XI".

### 8.5 Squad, contracts, youth and transfers
These come from `league.md` (Contracts, Youth intake), with the targets moved to the board 13 mapping.
- **Contracts:**
  - 4 weeks; the target is the habit kept on at least 5 days in 7 on average.
  - Hit the target and the habit renews on more money: its axis weight grows 5%, up to +15% over a career.
  - Miss it: no penalty in matches. The contract runs down and the habit is transfer-listed.
  - Contract lines: Steps at the step goal; Training at the planned sessions; Food inside the range with the protein target (never rewards eating under the plan); Sleep at the sleep target; Checklist with every slot ticked; Body logs with a weigh-in on 5 days in 7.
- **Youth intake:**
  - Three youngsters arrive in the days before each season, with at most one exercise among them.
  - 12 logged days in a season promote a youngster to the bench. Fewer than 4 means they leave on a free.
  - Potential stars set what a promoted youngster adds on days its habit is done: 3 stars +1, 4 stars +1.5, 5 stars +2.
  - Off the bench at 60', a youngster whose habit was done that day adds +2 to its axis for the rest of the match.
  - Exercise youngsters only reach the bench after the coach's plan includes them.
  - The pool names exercises, loads and physio notes, so it lives in a private file, not in the repo (section 12).
- **Trading a habit:**
  - Selling a habit stops Football tracking it.
  - The buyer pays in money, a youth slot or a staff member.
  - Its history stays, and it may turn up against you later.
  - Football never stops Health from tracking the habit.

### 8.6 Money, sponsors and the transfer budget
These come from `league.md` (Money).
- **One transfer budget** that grows with promotion.
- **Sponsor slots:**
  - Shirt and kit maker from the start.
  - A sleeve slot from Division Four.
  - Ground naming once Kaai 42 is built.
  - Up to three partners.
- **Offers** arrive in the days between seasons. Each sponsor is stable, flashy or dodgy:
  - dodgy ones pay the most and have a 1 in 4 chance a season of collapsing
  - at most one light habit clause at a time
  - no betting or alcohol brands
- **Real brands** are offered from Division Three up. Your own sponsor can go in any slot.

### 8.7 Rivals (boards 12, 13)
- **Antigoon FC is always a rival** (the legend), with its modifier "Giant's hand": their first chance in each half is a big chance (+2 on their type's axis press).
- **A club becomes a rival by:**
  - beating you on a big night (cup tie, final, derby or last day)
  - beating you three times running
  - beating you in a match that auto-played at 4 am
  
  Each comes with a moment, "A rival is born".
- **Limits:** up to three earned rivals at once. Beating one five times in a row makes it fade.
- **Every rival match** is a derby (full takeover on goals) and carries the rivalry's own modifier, which comes from how it started:
  - "Bad blood": in the last ten minutes, every chance both ways is a big chance.
  - "In step": they press on your best axis from your last meeting.
  - "Night shift": if the match auto-plays at 4 am, your Rest shrinks by 2.
  
  Part 1 writes one modifier per way a rivalry can start, at least six in all.
- **Groundshare derby:** against Zurenborg Athletic, the landlords, who get the home dressing room even when Brabo are listed at home.

### 8.8 Kits and crests
These come from the kit, crest and stadium design.
- **Crest:** five steps, with the step 1 hand-me-down at founding and steps 2 to 5 on promotion through Division Two. Each step offers five options (`crests/1a`–`5e`), plus a keep card from step 2. Old crests return on the anniversary kit.
- **Kits:** each launch day offers several designs per slot (H1–H6, A1–A6, T1–T6 on the kit picker board) in every sponsor style. The third kit unlocks in Division Four.
- **The data kit** is a third-kit option from season 2. Its six stripes are the previous season's six weeks: width is the week's average radar, tone is the week's result, and the weekly numbers are printed in the collar.
- **The anniversary kit** comes every fifth season.
- **The one-night patch** is a cream circle with the day, placed in the middle of the chest between the badges and the sponsor, for finals and derbies. It stays on that shirt on the kit wall.
- **Other clubs' crests:**
  - Made-up clubs use the crest kit of parts: six outlines, a symbol from their name or town, and the club colour.
  - Real clubs get simplified outlines of their real badges (owner, 6 Nov: kept, since the app is personal and non-commercial).
- **Real clubs** wear their real colours, sponsors and kit makers as plain wordmarks, re-checked at build time.

### 8.9 The ground and the Kaai quarter
These come from the kit, crest and stadium design (section 4, rounds 3 and 4).
- **The tenancy and its events:** a rent rise, a locked-out week, the last derby as tenants, and farewell night.
- **Kaai 42:** the plot is bought in Division Five, built stand by stand with bundles (habit totals plus money), and moving day comes at a season break.
- **The quarter:** a shop, a café, the academy, a training ground, a museum and a ferry stop, each with optional overhaul stages. Big overhauls close the building for a while.
- **Bundle rules:** they only count day or week totals, and their effects are small (the table in the stadium design).
- **Sealed reveals and bookends** as drawn.
- **Capacity sets gate money.** Attendance follows results and tier.

### 8.10 The world, news and the cast
- **World events** come from `league.md` (The world that moves without you): sackings, takeovers, financial trouble, folds and phoenix clubs, golden generations, record signings, legends retiring and more. Dark turns are allowed.
- **News:** one headline a day, a weekly roundup, and club feeds. The back page has memory: it calls back earlier results and runs.
- **The line bank** is big enough that no template repeats within 30 days: at least 400 back-page lines, 150 studio exchanges and 60 press questions, each with three answers. Lines take facts (scores, streaks, clubs, minutes) so similar nights still read differently. Tests enforce the no-repeat rule.
- **The cast:** the gremlin and the pundit. Football's gremlin is Health's gremlin wearing a Brabo scarf, so there is still one gremlin in the app.

### 8.11 Old Selves
These come from `league.md` (Old Selves).
- **Each finished month** becomes "AFC <Month Year>", rated from that month's average radar and placed in the tier that rating earns.
- **From day one,** the past months in Health's history fill the 7 slots, as drawn in the first run.
- **Each season,** the newest month joins and the weakest Old Self retires to the Old Selves Cup.
- **Their hidden ability, "Familiar":** that month's best axis shrinks a further 2.
- **Their crest** comes from the kit of parts, and their nickname from what the month was like.

## 9. The season, cups and events

### 9.1 The pyramid
- Six tiers of 18: the Crown League, then Division Two to Division Six. That's 40 real clubs, 60 quirky clubs, 7 Old Selves and Brabo United. Brabo starts in Division Six.
- **Promotion:** the top 2 go up. 3rd to 6th play one-match semi-finals, then a final at a neutral ground.
- **Relegation:** the bottom 3 go down. Division Six has no relegation; its last club may fold in the lore.
- **The Crown League's top finishers** play in continental cups the next season.

### 9.2 Forty-two days
Each season has:
- 34 league matchdays
- 4 Big Cup days
- 2 tier-cup days
- finals weekend:
  - Day 41: playoff semi-finals and the Big Cup final.
  - Day 42: the playoff final, the tier-cup final and awards night.

Also:
- **Cup days** fall about every fifth day.
- **Out of a cup:** the reserves and youth play cup days.
- **The transfer window** is days 21 to 23.

### 9.3 No rest days (board 10)
Event nights are woven into the season as hexagons. Between seasons there are only as many days as the next event needs, for example 1 for the Super Cup and 7 for the World Cup. Daily data plays every one of those nights. Season 2 begins the morning after the last event day.

### 9.4 Events
- **The rotation:** the World Cup and the Continental Nations Cup each come every fourth season, offset. The Club World Cup replaces the next event after Brabo become continental champions.
- **Invented events** are drawn without repeats: pre-season tour, Super Cup, Old Selves Cup, Tournament of Lost Clubs, Five Nations Cup, Winter Derby Week, Charity Legends Match, Floodlit Invitational, Island Cup, Night of 108, Testimonial and Centenary.
- **The World Cup** (board 11, C):
  - Pick a country in settings. You play only if your 28-day average real radar reaches that nation's bar; strong nations need about Crown League level.
  - 48 nations in 16 groups of three. Day 1 is a double-header, day 2 one match. The top two go through.
  - Then one knockout round a day: last 32, last 16, quarter-final, semi-final, final.
  - The rundown covers the whole tournament and its giant-killings.

## 10. Data

New IndexedDB stores, all inside the full backup:

| Store | Holds |
|---|---|
| `fbSave` | one row: founding date, current season and day, settings (buzz, World Cup country, own sponsor), armband, stack, ability slots, budget, crest choices, kit choices, ground and quarter state, first-run done |
| `fbClubs` | 108 rows: id, name, tier, rating, style, colours, abilities, quirk revealed, lore, wiki entries, rival state |
| `fbMatches` | one row per played fixture: date, season, matchday, competition, home and away, the six real values, modifiers, the full event list, score, xG, moments, watched or not |
| `fbSeasons` | one row per season: tables, cup brackets, awards, Wrapped data, kit worn, crest step |
| `fbSquad` | six members plus youth: contract state, form, traits, awakenings, knocks, cards |
| `fbNews` | headlines, the weekly roundup, club feeds, press answers |
| `fbBundles` | bundle progress per structure |

- **Static data** (clubs, abilities, kits, crests, line bank, benchmarks) ships as versioned JSON in `src/football/data/`, generated from the league script. The axis notes in `league.json` move to the board 13 mapping.
- **Migration:** adds the stores empty. Football starts at the first run.

## 11. Workflows (board 13, all pinned)

**One day:**
1. 4 am: a new matchday begins, and last night plays if it was never closed.
2. Morning: the sealed result waits on Today.
3. Through the day: each log fills tonight's shape, and the small lines say so.
4. 6 pm: the half-time card.
5. Close the day: kick-off, watched now or later.
6. Full time, the studio, and the optional press conference.

**When the day doesn't go to plan:**
- **Never closed:** the match auto-plays and waits sealed.
- **Logged after closing:** the result stays.
- **Days away:** the catch-up reel.
- **No data yet:** the axis plays at 10, marked "no data".

**The season** follows sections 9.2 and 9.3. **The first time** follows section 5.8.

## 12. Privacy (public repo)

- No personal targets, plans, loads, medicines or medical notes appear in code, tests, specs or comments. The engine reads targets from settings at run time.
- **The youth pool's exercise entries** (they name loads and physio checks) live in `private/football-youth.json` (git-ignored). The repo ships only the habit entries plus a loader that merges the private file when it exists.
- **Real players at real clubs** were chosen knowing the repo is public (league round 2). Real sponsors appear as plain wordmarks, never logos.
- **Tests use made-up fixtures,** never the owner's backup.

## 13. Out of scope (later)
- An editor for the habit-to-axis mapping (shown, fixed).
- Reminders or notifications.
- Real football in any form.
- Sound.
- Group chat and fanzine (the concepts were liked, the designs weren't).
- Walk-out song and mascot (skipped in the kit chat).
- Weather beyond the one roof effect.
- The match line on Health's day card for Logbook (the shelf field).

## 14. Build order

Five parts, each shipping on its own, each with a plan, native execution, a browser check at 360 px and one review at the end of the build (`feedback-final-review-only`).

1. **Core (pure logic, no screens):**
   - the benchmark research pass
   - axis values
   - the seeded engine with stored events
   - opponent modifiers and the odds calibration tests
   - the world sim, the calendar, promotion and relegation
   - league data import with the board 13 mapping
   - stores, migration, backup
   - plus a dev route that plays a match
2. **The tab and the match:**
   - tab bar A with the plus beside the handle
   - the Football home with its four tabs
   - Tonight
   - the match screen with every animation, skip and haptics
   - full time
   - 4 am auto-play and catch-up
   - Today's card and the Close the day handover
   - the first run
3. **League:**
   - table, pyramid, calendar
   - club pages with crests (kit of parts for made-up clubs, real outlines for real clubs)
   - grounds, news and the back page, wiki
   - cups and the bracket
   - promotion, relegation and the playoffs, and the new-division page
   - Old Selves
4. **Club:**
   - squad and player pages
   - armband, stack, abilities and awakening
   - physio and cards
   - contracts, youth and trading
   - budget and sponsors
   - kits (launch day, wall, data, anniversary, patch)
   - crest level-up
   - the ground, the quarter and bundles, with bookends and opening night
5. **Story and the edges:**
   - the studio and the press conference with the full line bank
   - rivals
   - moments and Season Wrapped
   - events and the World Cup
   - settings
   - the small lines on Train, Walk and You
   - the Matches export sheet

## 15. Testing

- **Test-first for every pure rule:**
  - each benchmark row
  - Fuel never rising when eating less
  - tier-relative ratings
  - chance counts and splits
  - landing and coverage maths
  - modifier order
  - tiredness
  - the stack cap
  - knocks, injuries and cards
  - day statuses and the rotation shape
  - contracts and youth
  - calendar layout
  - promotion, the playoffs and relegation
  - rival birth and fading
  - line-bank no-repeat
- **Determinism:** the same seed and inputs give the same event list, and a late log after kick-off changes nothing.
- **Simulation tests** for the target odds (section 7.4) and table spread.
- **Privacy:** a test that scans `src/football/` and the specs for the private file's field names and fails if any appear.
- **Browser checks** at 360 px on restored dev data, compared side by side with the boards:
  - text sizes, targets, collisions and scrollWidth
  - a greyscale pass for "never colour alone"

## 16. Where older sources are overruled

| Older source said | Now |
|---|---|
| `league.md`: Fuel = protein, Routine = bedtime, Shape = calorie budget | Board 13: Fuel = calories and protein, Routine = checklist, Shape = body logs |
| League design: World Cup for Belgium, call-up only | Board 11: pick a country, play if your rating earns it |
| League design: breaks of 3 to 14 days between seasons | Board 10: no rest days; only the event's own days |
| Board 13 drawing: sick or injured postpones the match | Owner's note: the rotated squad and youth play |
| Board 12: one earned rival | Board 13: up to three, each with its own modifier |
| Board 12: press conference with one honest answer | Board 13: every answer a joke, and the answer becomes the headline |
| Kit stadium design: the physio room raises the knock threshold | Section 8.3: it raises the injury threshold, since a knock now comes after one missed day |
| Board 12 patch in pale gold | Cream, because gold is for records, finals and trophies |
| Quirks that read close-of-day time (Herring Fleet, Night Owls, Midnattssol) | Already rewritten in `league.md` to day totals or values you enter; the build uses `league.md` |
| Board 1 "Football if it fits, otherwise Club" | "Football", which fits at 360 px in the centre slot |

## 17. Decided after review (6 Nov)

1. **Real club badges:** B. Real clubs get simplified outlines of their real badges, since the app is personal and non-commercial. The trademark risk is accepted.
2. **Occasion days:** A. The rotated squad and youth play for points, as on sick, injured and break days.
3. **The shelf field:** dropped for now, moved to section 13.
4. **Football home:** B, four tabs along the top.
