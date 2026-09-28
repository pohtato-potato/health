# Health

A personal tracker for food, steps, sleep, training and body, built as an installable web app (PWA) for an Android phone.

**Open it:** https://pohtato-potato.github.io/health/ — in Chrome on the phone, tap ⋮ then **Add to Home screen** to install it. Every push to `main` rebuilds and republishes it.

- **Everything stays on the phone.** Data lives in the browser's IndexedDB. There is no server, account or analytics.
- **The code holds no personal data.** Body numbers, targets, the checklist and saved foods arrive through a private starter file or are typed in on first launch. The app starts with a built-in home A/B dumbbell plan, which a starter file or an imported plan replaces. Backups (`.json`) and the workbook export (`.xlsx`) are saved from the app to wherever you choose.
- **Plans are data.** A training plan is a JSON file (`format: "health-plan"`) with sessions, exercises, rep ranges, loads and joint flags. The app applies the rules: alternating sessions, go-heavier suggestions from the plates you own, a slow-lowering step before big jumps, harder variants, side balance, swaps after a flagged joint, short sessions and triggers.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # domain logic and database tests
npm run build    # production build in dist/
npm run icons    # re-render the app icons
```

Stack: Vite, React, TypeScript, Dexie (IndexedDB), vite-plugin-pwa. Fonts (Fraunces, DM Sans, DM Mono) are bundled so the app works offline.
