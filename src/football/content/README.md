# Football engine 2: content

All the game content for engine 2, as typed data (approved spec, section 16: "content scope: all of it", "straight into code"). Nothing here runs the engine; layers 1–4 import it from `src/football/content` (`index.ts` re-exports every file). The shapes are in `types.ts`.

Tests: `tests/football/content.test.ts` checks the counts, unique ids, tech prerequisites (valid, acyclic, from the same or an earlier era, every era enterable), staff ↔ tech and project ↔ tech links, the nation pool, the careful-season money rule, and that nothing adds flat rating points, rewards eating less, shames, or uses religious or astrology motifs.

| File | What | Count | Read by |
|---|---|---|---|
| `types.ts` | Shared shapes: `Effect`, `Trigger`, `Metric`, `When`, `Reward` and one type per kind | | all layers |
| `traits.ts` | Traits, each limited to one situation, and a Legend signature move per unit (named goal type, commentary lines) | 30 traits, 6 signature moves | layer 2 (limit-break traits), layer 4 (duty, Legend) |
| `tree.ts` | The six eras (cost, colour, intro) and 48 techs: effect, cost, prerequisites, eureka | 6 eras, 48 techs | layer 3 |
| `staff.ts` | Staff, each hired by a tech, with wages in wage units; the club doctor levels on medicine days | 18 | layer 3 |
| `projects.ts` | Projects and building stages as one list: every shipped `ground.ts` bundle (read from `BUNDLES`, never restated), new stages on the Kaai skyline, and journeys | 41 (25 shipped bundles, 11 new stages, 5 journeys) | layer 3 (and the Club page's skyline) |
| `season.ts` | Boons, bounties, the board's objectives with chairman lines, the 42-step season track, its kit pieces and themes | 24 boons, 30 bounties, 16 objectives, 42 steps | layer 3 |
| `packs.ts` | Pack slots and odds, Icon loan odds, boosts | 5 items a pack, 12 boosts | layer 3 (packs), layer 4 (loans) |
| `album.ts` | Eleven themed album sets with one-line facts, rarity and a set reward; duplicate research | 11 sets, 271 cards | layer 3 |
| `loans.ts` | The loan pool: name, nation, unit, tier, style, signature trait, arrival and farewell lines, drawing brief | 60 (10 a unit: 19 Icon, 23 Prism, 18 Gold) | layer 4 |
| `nations.ts` | Nations, the name-word map and the pool everyone else is drawn from | 41 nations, 20 words, 31 in the pool | layer 4 |
| `words.ts` | Scout lines, era intros, named-goal and save commentary, youngster farewells, duty lines, the running-low notice | 24 scout, 6 intros, 32 goal, 9 save, 14 farewell | layer 1 (goals, saves), layer 4 (scout, duty, farewells), layer 3 (eras) |
| `money.ts` | Wage units by division, gate per fan, sponsor shares, buy-back units, a careful season | | layer 2 (buy-back), layer 3 (wages, sponsors) |
| `pools.ts` | Sizes of every limited pool, and the running-low rule | 4 pools | layer 3 |

## Notes for the layers

- **Effects.** `Effect` has no rating kind. `axis` effects are +1 or +2 in one named `When`, never `always`. `rule` knobs (`RuleKey`) each name one rule; their `value` is the new number (or the change, for `knock-days`, `freshness-cost` on traits, `lesson-*`, `research-*` and `trials-*`).
- **New `When` values** (`second-half`, `behind`, `ahead`, `set-piece`, `derby`, `cup`, `final`, `continental*`, `auto`, `first-chance`, `after-goal`, `after-save`, `vs-higher`, `international`) need engine support in the layer that first uses them. The first ten match the shipped `BraboAbility['when']`.
- **New `Metric` values.** The ones shared with `ground.ts` `Need` mean what `dayCounts` means. The rest (`km`, `long-walk`, `session-week`, `three-meals` and so on) need counting in layer 3. `academy-wing`, the five journeys and some bounties use them, so they aren't `BundleDef`-compatible until then.
- **Money.** Wages are paid at season end. Staff the budget can't cover go on leave until it can; there is no debt. `carefulIncome(tier)` uses the shipped `incomeFor`, and the test checks that it covers one wage plus one open building stage in every division.
- **Running low.** `runningLow(collected, size, shownForSize)` returns true once 80% is collected, if it hasn't shown for this pool size yet. With these pool sizes the crossing lands between 80% and 85%.
- **Nations.** `nationInName(name)` checks `NATION_WORDS` in order. Players without a name-nation get one from `NATION_POOL`, once and for good. Every pool code is a country in the league or the continental data.
