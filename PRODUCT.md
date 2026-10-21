# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
One person, the owner, on an Android phone, with Health installed from Chrome as a home-screen app. Some days he works from an office, other days from home. He trains at home four times a week with adjustable dumbbells, using his bed as a bench. Most logging happens late in the evening, usually after 9 pm, often for the whole day at once; training happens in the late afternoon or evening, often after office and on low battery. He is not a coder. He runs a design and data audit of the app every month or two.

## Product Purpose
A personal tracker for food, steps, sleep, training and body that keeps the habit going and tells the truth. Success means the habit sticks, the data is honest enough to learn from, and the app gets him toward an athletic build (waist-to-height first, weight as context) by reveal day.

## Positioning
Built for exactly one life: Indian food in katoris and pieces, home dumbbells, office days, a walk across India made of his own steps, and celebrations he looks forward to. It learns from his data with published methods and shows its working. No commercial tracker can be this specific or this candid.

## Operating Context
- Daily: the morning log (often filled in later in the day), food logged mostly at night, a medicine and supplement checklist, steps copied from Samsung Health.
- Four home training sessions a week on an alternating A/B plan; a mirror for form; rest timer over music in headphones.
- Places change the day: home, office, travel, out with friends. Status changes the targets: sick, injured, travelling, a break.
- A sister app, Logbook, shares a daily "shelf" with Health (postcards and feeling families). Last.fm listening history is available with his key.
- Monthly: a check-in (photos, tape, a sealed line) and a Claude review using a Claude Project and an exported audit pack.

## Capabilities and Constraints
- Installable web app (Vite, React, TypeScript, Dexie/IndexedDB, vite-plugin-pwa), offline-first, hash routes, published on GitHub Pages from a public repo.
- Data stays on the phone. No server, no account, no analytics. Exceptions the owner approved: Last.fm (read his listening history) and barcode lookups (Open Food Facts), both only when online.
- No notifications and no reminders outside the app; banners inside the app only.
- Personal values (places, meal times, checklist, body numbers, plan, setup, keys) never appear in the repo; they come from a private starter file.
- Full feature scope: `docs/superpowers/specs/2026-10-12-health-v2-design.md`.

## Brand Commitments
- Name: Health.
- Voice: one voice, "Gremlin": cheeky, never about the body or food. Any joint flag switches to plain speech. Data prompts and confirmations are always plain.
- Celebrations are core to the product and must feel awe-worthy rather than skeuomorphic.
- The walk across India is the owner's favourite feature and gets its own tab, with illustrated stops.
- Nothing rewards eating less; no logging streak; training never earns extra credit beyond the weekly target.
- Themes are diverse and surprising (world festivals, sky, nature, nerdy days, personal dates), each with a "why today" note.

## Evidence on Hand
- The owner's real backup (two weeks, 27 Sep – 11 Oct 2026) and six rounds of feature ratings (12 Oct 2026); both live outside the repo.
- No testimonials, users or metrics beyond the owner's own data. Never fabricate any.

## Product Principles
1. Honest data first: never pre-fill an answer, never show "not logged" as zero, never change a number silently.
2. Moments keep the habit: invest in celebration, story and the walk.
3. Fit the evening: assume late logging and context (place, status, office days).
4. Quality over numbers in training: form, clean reps and effort decide progress.
5. Learn him openly: adaptive models with published methods, visible working and a track record.

## Accessibility & Inclusion
The owner has about 40% vision loss and poor depth perception, and reads the phone with the **Android magnifier**. Design for how he actually reads, and ask him before changing sizes:

- **Type.** Don't simply make everything bigger: with the magnifier on, oversized type means more panning and slows him down. Keep the app's standard type scale as the default; "Larger text" (Settings › Feel) is an option, off by default. What helps is clear hierarchy, steady positions (things stay where he expects them, so the magnifier finds them), and strong contrast.
- **Contrast.** WCAG AA is the minimum. A high-contrast option (Settings › Feel) brings quiet and dim text close to full brightness; new colours must stay legible with it on.
- **Aim.** Anything tapped mid-set must be reachable without fine aim: 44 px targets at the least, set fields and the done dot bigger with larger text, and an option to enter every set with the big dial and chips.
- **Depth.** Don't rely on shadows, blur or overlap to show what is on top or tappable; use borders, position and labels.
- Reduced-motion support stays.
