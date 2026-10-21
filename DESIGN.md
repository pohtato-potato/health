---
name: Health
description: A one-person tracker for food, steps, sleep, training and body, lit like a walk at dusk.
colors:
  ink: "#0e1020"
  deep: "#080a17"
  tabbar: "#0a0c19"
  surface: "#171b36"
  raised: "#1e2346"
  hairline: "#232849"
  divider: "#1d2140"
  track: "#262243"
  btn-border: "#2a2f55"
  text: "#ede6da"
  quiet: "#aeabbd"
  dim: "#8e8ba6"
  faint: "#6b6890"
  voice: "#e8dfd1"
  apricot: "#e98a5b"
  lavender: "#b7a6f0"
  sage: "#8fc9b0"
  blue: "#8fb6c9"
  gold: "#f2c46d"
  rose: "#e79a9a"
  pearl: "#c9dcea"
  gold-bg: "#221d14"
  gold-border: "#6b5a33"
  sage-bg: "#13201d"
  sage-border: "#2f4a3f"
  lav-bg: "#1a1730"
  lav-border: "#3a3350"
  paper: "#eee8dc"
  paper-ink: "#2a2620"
  danger: "#e38a7c"
typography:
  display:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: "40px"
    fontWeight: 300
    lineHeight: 1
    fontFeature: "lnum"
  headline:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.1
  title:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.15
  voice:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: "17px"
    fontWeight: 300
    lineHeight: 1.4
  body:
    fontFamily: "DM Sans Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "DM Sans Variable, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0.14em"
  mono:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  hair: "3px"
  box: "8px"
  note: "14px"
  tile: "16px"
  card-sm: "18px"
  list: "20px"
  card: "22px"
  sheet: "28px"
  pill: "999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  card-x: "20px"
  page-x: "22px"
components:
  button-primary:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  chip-on:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  card-gold:
    backgroundColor: "{colors.gold-bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  field:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.text}"
    rounded: "{rounded.tile}"
    padding: "0 16px"
    height: "48px"
  list:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.list}"
    padding: "0 18px"
  tabbar:
    backgroundColor: "{colors.tabbar}"
    textColor: "{colors.dim}"
    height: "76px"
  sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sheet}"
    padding: "4px 20px 24px"
  toast:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.list}"
    padding: "12px 14px 12px 16px"
---

# Design System: Health

## Overview

**Creative North Star: "Dusk Strata"**

The app is lit by where you are on the walk and the hour. Everything sits on a deep indigo night ground built from three tonal layers (ink, surface, raised) separated by one-pixel hairlines, not by shadow. On that ground, colour appears only where it carries meaning: a small set of soft metric inks for the things being tracked, gold kept for records and moments, and a faint tint on whichever tab is open. The layout is one calm phone column, dense with numbers but never loud.

Numbers and titles speak in a light, optical-size serif (Fraunces); everything you operate speaks in a quiet sans (DM Sans); clocks, wheels and receipts speak in a mono (DM Mono). The serif is the voice of the data, which is why counts are set at weight 300 with lining figures and line-height 1.

The world has a second register for celebration: full-screen moments, story cards, the monthly film, a paper receipt, postcards from the walk and a split-flap departures board. These step outside the card grammar on purpose, but they draw from the same inks and the same serif. Theme days (festivals, sky, nerdy and personal dates) repaint the ground and accents for one day.

**Key Characteristics:**
- Deep indigo night ground with tonal layering and hairline borders; shadows only on things that float.
- Fraunces for numbers and titles, DM Sans for UI, DM Mono for clocks and printed matter.
- Metric inks with fixed meaning; gold reserved for records and moments.
- Every tappable control is a full pill or a softly rounded tile, at least 44px tall.
- One phone column, 480px wide at most, with safe-area padding top and bottom.
- Motion that settles (expo-out), all of it switched off under reduced motion and in battery saver.

## Colors

Soft, dusty inks on deep indigo: nothing saturated, nothing pure white, every accent tied to a meaning.

### Primary
- **Dusk Gold** (gold): records, personal bests, moments, the seasonal strip, the dial needle and the focus ring of custom instruments. Its washed pair, **Ember Cellar** (gold-bg) with **Old Brass** (gold-border), forms gold cards, cues, notices and the drop target in Close the day.

### Secondary
- **Apricot Ember** (apricot): energy and calories; also the Today tab tint.
- **Evening Lavender** (lavender): protein; also the You tab tint and the "secret found" family. Washed pair: lav-bg with lav-border.
- **Pale Sage** (sage): steps and things going well (switches on, good form, positive deltas); also the Walk tab tint. Washed pair: sage-bg with sage-border.
- **Mist Blue** (blue): sleep and rest (the rest pill fill); also the system focus outline.

### Tertiary
- **Dusty Rose** (rose): loss, strain and removal (remove links, negative deltas, sore regions on the body map, sloppy form).
- **Pearl** (pearl): check-ins, photos and the walk's map outline; a cool light accent in moment confetti.
- **Paper** (paper) with **Sepia Ink** (paper-ink): the only light surfaces in the app, used for the weekly receipt and walk postcards.
- **Brick** (danger): the destructive button's text, on a dark rose border.

### Neutral
- **Night Ink** (ink): page ground, field wells, the segmented-control trough.
- **Deep Night** (deep): full-bleed overlays and the scanner well; **Tab Night** (tabbar) carries the tab bar.
- **Indigo Surface** (surface): cards, lists, sheets.
- **Raised Indigo** (raised): tiles in the log sheet, toasts, the rest pill, the resume pill.
- **Hairline** (hairline) and **Divider** (divider): one-pixel card edges and list separators.
- **Track** (track): empty bar tracks.
- **Button Edge** (btn-border): ghost buttons, chips, round buttons, the grabber.
- **Moon Text** (text): primary text, and the fill of the primary button and selected chips.
- **Quiet** (quiet), **Dim** (dim), **Faint** (faint): secondary text, tertiary text, and empty checkbox borders or locked states.
- **Voice** (voice): the italic serif lines that carry the app's personality.

### Named Rules
**The Fixed Ink Rule.** Apricot is energy, lavender is protein, sage is steps, blue is sleep and rest, rose is strain or removal, gold is a record. A metric keeps its ink on every screen and every theme; the metric tokens (kcal, protein, steps, sleep in tokens.css) are never overridden by a theme or by night mode, so bind metric colour to them.

**The Earned Gold Rule.** Gold marks something the owner did: a record, a moment, a milestone, a seasonal day. It is never decoration on an ordinary card.


## Typography

**Display Font:** Fraunces Variable (with Georgia, serif), optical sizing on
**Body Font:** DM Sans Variable (with system-ui, sans-serif)
**Label/Mono Font:** DM Mono (with ui-monospace, monospace), weights 400 and 500

**Character:** A soft, light old-style serif for the numbers and names that matter, against a plain geometric sans that stays out of the way. The mono is the voice of machines and printed things.

### Hierarchy
- **Display** (Fraunces 300, 40px and up, line-height 1, lining figures): hero numbers on Today and track screens, dial values. Moments go to 36 to 44px at 400; the monthly film and rest screen go larger (up to 96px).
- **Headline** (Fraunces 400, 30px, 1.1): screen titles.
- **Title** (Fraunces 400, 26px, 1.15; a smaller 20 to 22px step for card and settings-part titles): section and card titles, the walk band's place name (28px).
- **Voice** (Fraunces italic 300, 17px, 1.4, voice colour): the personality line, one per surface at most.
- **Body** (DM Sans 400, 15px, 1.4; 1.5 for longer prose): everything else. Steps of 11 to 17px are used for secondary lines, with 13 and 14px the most common small sizes.
- **Label** (DM Sans 400, 12px, 0.14em tracking, uppercase, quiet): names the data or group directly beneath it: list group headers, field names, card titles like "Stats" or a meal name. An 11px small step exists.
- **Mono** (DM Mono 400, 12 to 18px, tabular figures): wheel pickers, the receipt, boarding passes, the plan editor's order numbers, the rep ladder.

### Named Rules
**The Serif Counts Rule.** Any number the owner reads as a result is set in Fraunces at weight 300 with lining figures. Numbers being entered or ticking by (fields, wheels, timers in the rest pill) use tabular figures.

**The Label Names Data Rule.** The tracked uppercase label sits on top of the thing it names. It never stands above a serif title as decoration.

## Layout

A single phone column: the app is at most 480px wide and centred. Pages pad 22px at the sides, 18px plus the top safe area above, and clear the 76px tab bar plus 36px and the bottom safe area below. Page sections stack with a 16px gap; inside cards the gap is 10px (6px on small cards). Gaps step through 2, 4, 6, 8, 10, 12, 14 and 20px. Two- and three-column grids use a 10px gap. There are no breakpoints: wider screens get the same column. Fixed layers (tab bar, sheets, toasts, the resume pill, save bars) are centred and capped at the same 480px.

## Elevation & Depth

Depth is tonal. Resting surfaces are flat: ink, then surface, then raised, each edged by a one-pixel hairline. Shadows appear only on things that float above the page: toasts, the resume pill, the rest pill, the plus button, the paper receipt and postcards, and full-screen overlays. Scrims darken the page to 72% before a sheet rises.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45)`): toasts and the resume pill (10px offset).
- **Paper** (`box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45)`): the receipt and postcards.
- **Dock** (`box-shadow: 0 10px 24px -12px rgba(0, 0, 0, 0.8)`): the rest pill.
- **Plus** (`box-shadow: 0 8px 18px -6px rgba(0, 0, 0, 0.7)`): the centre plus button in the tab bar.
- **Needle glow** (`box-shadow: 0 2px 8px -2px rgba(242, 196, 109, 0.6)`): the dial's gold needle.

### Named Rules
**The Flat Ground Rule.** Cards, lists, tiles and fields never carry a shadow. If something needs to read as above the page, it has to actually float.

## Shapes

Soft and round. Controls are full pills whose radius is half their height (48px buttons at 24px, 44px chips at 22px, 40px small buttons at 20px, 36px small chips at 18px, the 56px rest pill at 28px). Anything drawn smaller than 44px gets an invisible tap area that reaches 44px, so the look stays and the aim is easy. Containers step down as they nest: cards 22px, lists 20px, small cards and wheels 18px, tiles, fields and list rows 16px, notices 14px, checkboxes 8 to 9px, bars 3 to 4px. Sheets round only their top corners (28px). The walk band clips its scene with a 26px bottom curve, or 24px all round when it sits inside a page. Paper objects are nearly square (4 to 6px), and the receipt tears with a zigzag mask; the postcard tilts by -0.6 degrees. Status dots are circles.

## Components

### Buttons
- **Shape:** full pill (24px on 48px height; 26px on the 52px large size; 20px on the 40px small size, whose tap area reaches 44px).
- **Primary:** moon-text fill with night-ink label, 15px weight 600, 20px side padding.
- **Ghost:** transparent with a button-edge border, text colour, weight 400.
- **Danger:** transparent, brick text on a dark rose border, weight 400.
- **Press:** scales to 0.98. Disabled drops to 45% opacity.
- **Round:** 48px (or 40px) circle with a button-edge border; the selected state fills with moon text.

### Chips
- **Style:** 44px pill (36px small, with a 44px tap area), button-edge border, 14px text.
- **State:** selected fills with moon text and night-ink label at weight 600. Tool chips mark "on" with a blue border and soft blue text. Form chips take their form-scale ink when selected.

### Cards / Containers
- **Corner Style:** 22px (18px small).
- **Background:** surface; gold cards use the gold wash and brass border.
- **Shadow Strategy:** none (see Elevation).
- **Border:** one-pixel hairline; tappable cards shift to the button edge on press.
- **Internal Padding:** 18px by 20px (14px small).

### Inputs / Fields
- **Style:** 48px well in night ink, hairline border, 16px radius, 17px text with tabular figures. Search fields are pills with a leading icon.
- **Focus:** border brightens to quiet; small numeric fields brighten to moon text.
- **Error / Disabled:** form checks appear as an inline notice (gold wash, or a dark rose wash for warnings), never a pop-up.
- **Switch:** 48 by 28 track, sage when on. **Checkbox:** 26 to 28px rounded box; the tick draws itself in.

### Navigation
- **Tab bar:** fixed, 76px plus safe area, five columns with a centre plus button (52px moon-text circle). Labels are 11px in dim; the active tab takes its own tint (Today apricot, Train gold, Walk sage, You lavender) with a 4px dot beneath.
- **Back link:** quiet text with a chevron, 44px tall.

### Sheets
Bottom sheets rise from a 72% scrim, surface background, 28px top corners, a 40 by 4px grabber, and a scrolling body with 14px gaps. Tall sheets fill the screen less 56px.

### Toasts
Raised pill-cornered panels (20px) at the top of the screen with the float shadow, an optional action, and gold, sage or lavender washes for celebratory kinds.

### Wheel and Dial
The app's pickers. The wheel is a snapping mono column with a lens of two button-edge rules; the selected row grows to 22px in moon text. The dial is a horizontal tick ruler with a gold needle under a 40px serif value. Both fade their edges with a mask and show a gold focus ring.

### Rest Pill
A 56px raised pill docked at the bottom during a session: a blue wash fills left to right as the rest runs, the time sits in 24px, and an end button sits inside.

### Walk Band
A 250px illustrated scene of the current stop, layered far to near in the region's four inks and lit by the part of the day (dawn, day, dusk, night), with the place name in 28px serif over a soft text shadow.

### Today
- **Varied blocks, not a stack of cards:** only the moment card is a card. The walk, the line, the rings and Next up sit straight on the page, each in its own form.
- **Walk on Today:** the walk band runs edge to edge and melts into the page; the date, place and status sit in its caption on a dark band (`rgba(8,10,22,.66)`). Tapping it opens the full walk with the place and status pickers.
- **Banner slot:** one banner at a time, a line between two hairlines with a 44px action and a 44px dismiss that lasts the log day.
- **The line:** the day's headline in 26px serif, the time trailing it in 14px; the voice in italic only at moments, gold on a perfect day.
- **Rings:** the drawing, and beside it only the numbers (34px serif in each ring's ink) with a 14px unit. The target and its action appear on tap.
- **Moment card:** the one lit card (22px radius, soft offset shadow); gold border and button on a perfect day.
- **Next up strip:** between two hairlines like a departures row; a record night turns it into the gold records strip.
- **Logging below the fold:** usual-food chips, Log anything, meal tiles (kcal on one line, protein on its own), press-and-hold checklist chips.
- **Drawer handle:** a pill above the tab bar showing readiness, protein and Close the day; it opens the drawer.

### Moments and Stories
Full-screen celebrations on deep night with a centred serif title (36 to 44px), a quiet detail line, one voice line, and a large primary button. Backdrops (bloom, rays, bursts, rings, confetti) use the metric inks and gold. Stories and the monthly film use progress bars of 3px segments and tap zones to advance.

### Paper Objects
The weekly receipt (mono on paper with a torn edge) and walk postcards (tilted paper cards) are the only light surfaces, each with the paper shadow.

### Named Rules
**The Pill Rule.** Every tappable control is a pill or a rounded tile, and nothing tappable is shorter than 44px.

**The Settle Rule.** Things arrive and settle: sheets rise in 0.24s on cubic-bezier(0.2, 0.8, 0.2, 1), toasts drop in 0.25s on the same curve, moments and stories ease in on cubic-bezier(0.16, 1, 0.3, 1), scrims fade in 0.18s. Under reduced motion every animation and transition is removed; battery saver goes true black and stops all motion.

## Do's and Don'ts

### Do:
- **Do** separate layers with tone and a one-pixel hairline: ink ground, surface cards, raised tiles.
- **Do** bind a metric's colour to its metric token so theme days and night mode cannot change its meaning.
- **Do** set result numbers in Fraunces 300 with lining figures, and entered or running numbers with tabular figures.
- **Do** keep every tappable target at least 44px tall and shape it as a pill or rounded tile.
- **Do** give every new animation a reduced-motion off switch, and keep it still in battery saver.
- **Do** use the blue 2px outline (offset 2px) as the system focus ring, and the gold ring on custom instruments (wheel, dial, check, body map).
- **Do** keep text at WCAG AA: moon text, quiet and dim pass on every surface; faint is for borders, locked states and large text only.

### Don't:
- **Don't** put shadows on resting cards, lists, tiles or fields.
- **Don't** use gold for anything the owner did not earn.
- **Don't** use pure white text or light surfaces outside the paper objects (receipt, postcards).
- **Don't** reuse a metric ink for a different meaning (for example, sage for something other than steps or going well).
- **Don't** place a tracked uppercase label above a headline as an eyebrow; labels name the data beneath them.
- **Don't** draw icons with text glyphs or emoji; icons are inline SVG from the icon set.
