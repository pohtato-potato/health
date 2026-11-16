---
name: Health
description: A one-person tracker for food, steps, sleep, training and body, with a football club that plays on the day's habits. Lit like a walk at dusk.
colors:
  ground: "#0e1020"
  cream: "#ede6da"
  quiet: "#c4c1cf"
  kcal: "#e98a5b"
  protein: "#c2b2ff"
  steps: "#8fdcb6"
  sleep: "#93c3dc"
  gold: "#f2c46d"
  pearl: "#d9e8f3"
  coral: "#ff9a76"
  action: "#ff7a1a"
  axis-pace: "#8fdcb6"
  axis-power: "#ff9a76"
  axis-fuel: "#c2b2ff"
  axis-rest: "#93c3dc"
  axis-routine: "#f4aedb"
  axis-shape: "#d9e8f3"
typography:
  numbers-and-titles: "Fraunces Variable, Georgia, serif"
  hero-number: "Fraunces 600, 44 to 72 px"
  title: "Fraunces 400, 22 to 30 px"
  everything-else: "Atkinson Hyperlegible Next, system-ui, sans-serif"
  smallest-text: "14px"
rounded:
  panel: "20px"
  door: "18px"
  pitch: "22px"
  action: "999px"
---

# Health: the rule book

This is the rule book from the look pass of 13 and 14 November 2026. It replaces the old one. It was written from five boards of drawings the owner approved, and it describes what the app should look like, not what it used to look like. When a page and this file disagree, the page is out of date.

The shared parts live in `src/styles/kit.css` and `src/ui/kit/Kit.tsx`. Use them before writing anything new.

## Who it is for

One person, on a Samsung S23 in dark mode, with low vision. The phone gives an installed app about 745 px of height after the status bar. Every rule below serves legibility first.

## The twelve rules

### 1. One thing leads each page

A page opens on one thing: a picture, or one big number where the number is the answer (momentum, kilometres, calories, a rating, a league place). The desk leads with its dice, the tree with the tree, Club with the Kaai, Train with the week, Walk with its scene. Then come the panels, then the one action.

In code: a lead picture or `Hero`, then `Panel`s and `Doors`, then one `Action`. Wrap the page in `k-page`.

### 2. Filled panels in each thing's own colour

Panels are filled with a soft wash of their thing's colour (`Panel ink=…`). They replace outlined boxes. A panel you can tap has a hairline edge and a small drawn arrow; a panel that only tells you something has neither. Keep the edge and arrow quiet: the owner marked them "maybe".

### 3. One glowing action a page

Only the one thing to do next glows (`Action`). Its glow falls below it, like a real light. Other buttons are quiet: an outline, or a door. If a page has nothing to do next, it has no glowing action.

### 4. Rules live behind a "?"

Explanations do not sit on the page as paragraphs. They sit behind a "?" (`HelpButton`) that opens a "how this works" sheet: four short steps, each with its own drawn mark, and the key numbers as chips. A page with nothing on it yet shows one picture, one line and one thing to do (`Empty`), not a block of rules.

### 5. Colour is vivid

- Metric colours keep one meaning everywhere: calories apricot, protein lavender, steps green, sleep blue.
- The six Football axes keep their inks (Pace green, Power coral, Fuel lavender, Rest blue, Routine pink, Shape pearl), from `src/ui/inks.ts`.
- Doors are filled with their family's colour (rule 8). A door with no family takes the light of the page it sits on (`--w1`, `--w2`).
- Gold may be used freely.
- The orange glow is kept away from the purple, in opposite corners, so the two never mix into brown.

### 6. Type

- Fraunces for numbers and titles; Atkinson Hyperlegible Next for everything else.
- Hero numbers at weight 600.
- A small line sits under its title, never above it (`Title under=…`).
- Nothing smaller than 14 px. Body text is 15 px.

### 7. Icons are drawn

Every icon is drawn in one line weight (`Icon`, stroke 1.6 on a 24 px grid). Never a typed character: no typed arrows, ticks, stars or question marks as icons.

### 8. Finding your way

Four words across the top: Tonight, Club, League, Story, underlined where you are (`FootballNav`). Everything else is a door on that section's page, showing one live value. Inside a page there is one way back and the page's name (`PageHead`, or `FootballHome inner=…`). There is no second row of pills.

Every door in the app comes in a family, by the kind of place it opens: each family has its own colour, drawn icon and heading (`FamilyDoors`, `Door family=…`, `ui/kit/families.ts`), always in the order below. Football's six come first; the rest of the app has seven. A door to a metric's own page wears that metric's colour. A hue may mean one thing in Football and another outside it (pink is People there, Looking back here), never both on one page.

| Where | Family | Colour | Doors |
|---|---|---|---|
| Football | People | pink `#f4aedb` | Team sheet, Squad, Staff, the cast, Academy, Trials, Duty |
| Football | The place | coral `#ff9a76` | The ground, Projects, Kits |
| Football | Money and deals | gold `#f2c46d` | Money, Deals, the loan market, Loans, Packs |
| Football | Plans and study | lavender `#c2b2ff` | The tree, the board, the desk, How it adds up |
| Football | The world | blue `#93c3dc` | Every division, the atlas, the cups, the calendar, the congress |
| Football | The record | green `#8fdcb6` | Seasons, Moments, Rivals, Old selves, Bounties, the album (Train's Bounties panel too, marked "Football · The record") |
| Today, Train, Walk, You | Food | apricot `#e98a5b` | Today's meals, the Food page |
| Today, Train, Walk, You | Training | coral `#ff9a76` | Sets per muscle |
| Today, Train, Walk, You | The walk | green `#8fdcb6` | Your routes, the Map, Wrapped |
| Today, Train, Walk, You | Looking back | pink `#f4aedb` | Tracks, Insights, Reports, the month, the film, the archive, the year, the journey |
| Today, Train, Walk, You | Earned | gold `#f2c46d` | Earned, Titles, Records, Themes, Secrets, Achievements, So far, Rewards |
| Today, Train, Walk, You | Body | pearl `#d9e8f3` | Body (the check-in), the body log, Photos, For your physio |
| Today, Train, Walk, You | Settings and upkeep | slate `#c4c1cf` | Settings, the plan, Corrections; no family wash, only the dark, so it is told from the body's pearl by its fill too |

Protein and sleep have no page of their own, so no door wears lavender or blue outside Football. Where a page has four or more doors they sit under their family headings; fewer, they share one row.

A family door is filled with its colour and its name is written in it. Anything waiting gets a count chip with words ("2 to open"), never a different colour. A locked or empty door is dimmed with a dashed edge and says why in words. Inside a page, the header's small line names its family in its colour. Orange stays for the one action. Every word keeps 4.5:1 or more with high contrast on or off, and every heading on every theme's light (`tests/football/door-families.test.ts`, `tests/door-families-app.test.ts`).

### 9. The rings

The app's own rings, made brighter. Each band glows in its colour; a closed ring burns at full strength with a bright edge; the count sits in the heading, not the middle; when a goal is met its number turns radiant with a soft glow. All four closed turns them gold. The existing ring moments stay.

### 10. Themes

A theme changes four things everywhere: the light behind each page, the action colour (`--act`), the ring design, and Walk's sky. Metric numbers keep their own colours on every theme.

### 11. Walk's scenes

Drawn in layered dusk: flat layers of land, the lit road, the milestone and the walker, at dawn, day, dusk and night.

In code it is one system, `Layered` in `src/walk/art/Layered.tsx`, with its data in `land.ts`: the region gives the three layers' outlines, its own colours and what grows on it; the hour gives the sky, the sun or moon and how far the land is pulled toward that light; the worn theme tints the sky. Colours mix in OKLCH (`oklch.ts`) and steer round dark orange-yellow, so nothing turns brown or olive. The road is gold, green by night; the walker is cream by night. Motion is transform and opacity only. `WalkScene` draws it for where the walk is; `#/proto/scenes` (development) shows every region at every hour.

### 12. Checks before anything is called done

- 360 × 745 px and 340 × 700 px, dark mode, with realistic data.
- Nothing fixed to the bottom may cover content.
- Every target at least 44 px.
- No sideways scroll.
- Each screen compared side by side with its approved drawing, and every difference listed.

## The parts

| Part | Where | Use |
|---|---|---|
| Page light | `.k-light.you`, `.k-light.walk`, Football's aurora | the light behind a page; sets `--w1` and `--w2` for its doors |
| `Hero` | Kit.tsx | the big number, Fraunces 600, in its own ink |
| `Title` | Kit.tsx | a Fraunces title with its small line under it |
| `Sect` | Kit.tsx | a small-capitals section label with a hairline to the edge |
| `Panel` | Kit.tsx | a filled panel; with `onClick` it gets the edge and arrow |
| `Door`, `Doors` | Kit.tsx | a way into another page: mark, one live value, name; three or two across |
| `Action` | Kit.tsx | the one glowing action; `quiet` for a second, outlined one |
| `Chip` | Kit.tsx | a key number |
| `PageHead`, `BackLink` | Kit.tsx | one way back, the page's name, maybe a "?" |
| `HelpButton`, `HowSheet` | Kit.tsx | the "?" and its four-step sheet |
| `Empty` | Kit.tsx | a page with nothing on it yet |
| `FootballNav`, `FootballHome` | screens/football/FootballHome.tsx | the four words; `inner` gives a page its header |

## What the app never does

No notifications, streaks, shaming, betting or alcohol mechanics, or religious framing. No battery-saver or reduced-motion mode. Nothing rewards eating less. No game trigger reads the time a log was made. The public repo holds no personal data: no names, body numbers, plans, loads or medical details.
