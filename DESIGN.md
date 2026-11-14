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
- Doors take the light of the page they sit on (`--w1`, `--w2`); their icon may carry an ink.
- Gold may be used freely.
- The orange glow is kept away from the purple, in opposite corners, so the two never mix into brown.

### 6. Type

- Fraunces for numbers and titles; Atkinson Hyperlegible Next for everything else.
- Hero numbers at weight 600.
- A small line sits under its title, never above it (`Title under=…`).
- Nothing smaller than 14 px. Body text is 15 px.

### 7. Icons are drawn

Every icon is drawn in one line weight (`Icon`, stroke 1.6 on a 24 px grid). Never a typed character: no typed arrows, ticks, stars or question marks as icons.

### 8. Finding your way in Football

Four words across the top: Tonight, Club, League, Story, underlined where you are (`FootballNav`). Everything else is a door on that section's page, showing one live value. Inside a page there is one way back and the page's name (`PageHead`, or `FootballHome inner=…`). There is no second row of pills.

### 9. The rings

The app's own rings, made brighter. Each band glows in its colour; a closed ring burns at full strength with a bright edge; the count sits in the heading, not the middle; when a goal is met its number turns radiant with a soft glow. All four closed turns them gold. The existing ring moments stay.

### 10. Themes

A theme changes four things everywhere: the light behind each page, the action colour (`--act`), the ring design, and Walk's sky. Metric numbers keep their own colours on every theme.

### 11. Walk's scenes

Drawn in layered dusk: flat layers of land, the lit road, the milestone and the walker, at dawn, day, dusk and night.

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
