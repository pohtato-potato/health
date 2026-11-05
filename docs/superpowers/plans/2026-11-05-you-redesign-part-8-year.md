# You redesign, Part 8: Year page

**Spec:** section 7, Part 8 of the overview. **Goal:** a page for the anniversary: the almanac by month, most-of lists, the replay, day one against today and the blanket.

- `src/domain/yearPage.ts`: `yearOffered`, `almanac`, `mostOf`, `dayOneAgainstToday`, `blanket`, `blanketKey`, `yearReplay`.
- `src/screens/Year.tsx` at `/year`. Offered as a due line for the week after each anniversary; always reachable through Go to.
- Blank never reads as zero: months say "Not logged.", a comparison says "not logged", a bare stitch stays bare.
- Removes `#/proto/you`, `YouLiving.tsx` and `you-proto.css`.
- Tests: `tests/year-page.test.ts`.
