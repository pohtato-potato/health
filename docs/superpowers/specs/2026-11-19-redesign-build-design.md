# Building the redesign: design spec

19 Nov 2026 · Branch `docs/redesign-build-plan` (cut from `main` at 5319a55) · Status: for the owner's review.

The repo is public. This spec holds no names, body numbers, foods, medicines, places or plans. The pinboards it points to are private links; their sample numbers stay on the boards and never enter code, tests or comments.

## 1. What this is

Twenty-three redesign rounds (Home/Train boards 3–23, Walk/You boards 1–9) settled how each screen should look. This spec turns them into a build: **one pull request per tab**, holding every screen in that tab (Home and everything inside it, and so on), each tab shippable alone, in a fixed order. Inside a tab the screens are built one at a time, one commit each. Pages that need a redesign but were never pinned do not get built from guesswork. They go to one last design round (section 6), are put through `impeccable` there, and join the queue only once that round is pinned.

## 2. The reference

| Board | Link | What it holds |
|---|---|---|
| Picked | https://claude.ai/artifact/VpTPskgBJtnqQFQXjHH3bh | Every picked screen, newest version of each, grouped by tab (108) |
| 23 | https://claude.ai/artifact/Q2FjAQkbAPNtoogAzXuLtp | The final sweep: the board 22 fixes, cups, season end, other clubs, the rest of Football, pages outside Football (39) |

Mockup sources (outside the repo): `Review shared/mockups/build_picked.py` and `build_home_train_board<N>.py` / `build_walk_you_board<N>.py`. Each pinned screen is a Python string of HTML; its CSS is the builder's `CSS` (it accumulates down the chain, so board 23's sheet styles every screen). The mock is the visual reference and the source of CSS to port. Its numbers and names are samples.

**The latest answer wins.** Where a board 23 screen redraws a picked one, board 23 is built and the older one is dropped (section 4).

## 3. Owner's verdicts on board 23 (19 Nov)

- Pinned: the three goal scenes (tap-in, screamer, breakaway), full time, Congress, Trials, Academy, rival born, club level up, sponsor signing, the morning reveal.
- "Rest are good": every other board 23 screen is approved as drawn, except the ones with notes below.
- Notes, recorded as given:
  1. **Academy:** "add transition pages for when they graduate." The Academy page is built as drawn; the graduation transition is a new page for the last round.
  2. **Club page (Juventus, and so Liverpool):** "every club is supposed to have opinion which is to be reflected on this page, can't see it here." Club pages go to the last round.
  3. **Loan market:** "these are specific named players." The market goes to the last round, drawn with named players from the market data.
  4. **Opening night:** "while I really like this animation, all the places you have used it at have had the icons off center, fix that." The ring-and-rays moment keeps its animation; its icon, crest or card must sit dead centre in the ring wherever it is used. This is a build rule (section 5), not a redesign.
  5. **Awakening:** "same here": the same centring fix.
  6. **Cups:** "cups look good, no notes."

## 4. What is built

Every screen on the picked board, plus every approved board 23 screen, with these replacements:

| Built | Replaces | Why |
|---|---|---|
| Board 23 goal scene (tap-in) | Picked `m15-goal` | Board 22/23 notes: drawn as a scene like the wonder save, no radar. `m15-goal`'s open note (lines change with each goal and carry more facts) carries over. |
| Board 23 screamer scene | Picked `t17-arc` | Same note. |
| Board 23 breakaway scene | Picked `g16-gone` | Same note. |
| Board 23 trials (already on the picked board as `c23-trials`) | Board 22 `c22-trials` | The owner's pin on c22 said to redo it. |
| Board 22 food bar `h22-food` | The words on `f4-bar` | `h22-food` drops "800 to the aim"; `f4-bar` is otherwise kept. |

The hat-trick (`t17-bloom`) stays as it is. Deals, kits, the tree, the desk, the physio page and the plan editor stay as they are in the app except where a picked screen says otherwise.

## 5. Build rules for every screen

- **One tab, one pull request.** Branch `redesign/<tab>` from fresh `main`. Each screen in the tab is one commit on it, finished and checked before the next screen starts. The PR merges when the whole tab is done, before the next tab starts. A screen that needs a shared piece builds it in its own commit; later screens reuse it. (Owner's ruling, 19 Nov.)
- **Real data only.** Each screen reads what the app already stores. Where the mock shows something the app does not store, the PR does not invent it: it is either left out with a line in the PR description, or the screen moves to the last round.
- **Port the look, not the markup.** CSS comes over from the builder into the area's stylesheet under `src/styles/`, renamed to the app's prefixes and tokens. Colours go through CSS tokens so `html.contrast` reaches them.
- **Accessibility floor** (the owner has about 40% vision loss): nothing that carries meaning under 14 px, every target at least 44 px, never colour alone, no marquee or moving text for anything essential, the magnifier's standard text size.
- **Motion.** One-shot animations follow the O44 rule in `src/styles/motion.css`: they play once and end still. A mock that loops (the hold-to-tick ring, the plates swap, the goal scenes) keeps looping, as drawn: the owner's ruling of 19 Nov. Nothing essential moves: text and numbers stay still while decoration loops around them. Reduced motion shows the end frame straight away.
- **The ring-and-rays moment is centred.** One shared component draws it. Its centre piece sits in the ring's exact centre at every size, checked by a test on the markup and by eye at 340 px.
- **Design bans:** no eyebrows or kickers, no gradient text, no emoji icons, no glass decoration, no coloured left border wider than 1 px.
- **Checked like the boards:** at 1400, 420 and 340 px wide, with no horizontal page scroll, no text under 14 px, nothing clipped, and the reduced-motion end frame.

## 6. The last design round

A page goes here when it needs a redesign but no board pinned it, or when the owner's note asks for a change the board did not draw. Whenever a builder finds such a page during the build, it is added to this list and not built in that PR.

The round runs once, through `impeccable`: one pinboard in the boards' usual format, with the same rules as the build. Once the owner has pinned it, its screens join the queue as their own tasks. Until then they are not built.

**Starting list**

From the board 23 notes:
1. The graduation transition for an Academy player.
2. Club pages (played and not played) showing that club's opinion of you.
3. The loan market with specific named players.

Two approved looks for one page:
4. The muscle page: the picked body chart (`t3-body`) and board 23's bars against a range (`o23-mus`) both target `MuscleMap`. The round settles one.

Pages no board has pinned, to triage first (keep as it is, or redesign):
5. Football: first run, catch-up, press, parcel, studio, the radar (still used anywhere?), run card, habit line, pace sum, chance, the waiting screen, bookends, the ability banner, the cup-run side game itself (map and match), the world atlas, fog and redrawn screens, Old Selves, the rivals list, the Story home, the skyline, the season screens in the tree.
6. Outside Football: check-in, setup, pledge, photos, readiness, heatmap, benchmark, the maintenance cards, journey, the quiet session, review, day closed, the Tracks pages (sleep, steps, drinks, joints, shape, training, compare, food), banners, the not-found page.

Open questions carried into the round: whether readiness comes back, and whether the departure rows show "km".

Settled 19 Nov: looping animations loop (section 5). Code work for each part runs in its own forked session.
