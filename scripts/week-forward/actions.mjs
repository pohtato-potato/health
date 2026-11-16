// The once-off actions of the week, done through the screens: sign a sponsor, start a building, research a tech,
// pick a kit, wear a title, change theme, tie a trialist, spend dice on the desk, play a cup stop, change the plan.
// Each is a route and a short series of taps; a tap that is not on screen is noted, never forced.
import { step, tap, clearMoments } from './owner.mjs';
import { open } from './survey.mjs';

/** Taps each pattern in turn where present; returns what was tapped (or false if the first was missing). */
async function taps(page, seq) {
  const done = [];
  for (const [k, re] of seq.entries()) {
    const hit = await tap(page, re, { wait: 900 });
    if (!hit && k === 0) return false;
    if (hit) done.push(String(re).slice(1, 30));
  }
  return `tapped: ${done.join(' → ')}`;
}

const ACTIONS = {
  sponsor: (page) => async () => {
    await open(page, '/football/club?view=money', 1200);
    return taps(page, [/^Sign\b/, /^(Sign|Yes|Confirm|Sign it)\b/]);
  },
  // Buildings start on their own days (O42): the step records what the Projects page says each one counts and has
  // left. `finishBuilding` then brings the open building nearest done to one day short of every need, as a TEST
  // NUDGE written straight into the copy's store (the report says so), so the next logged night finishes it and the
  // check can see whether the finish is acknowledged.
  building: (page) => async () => {
    await open(page, '/football/club?view=projects', 1200);
    const t = await page.evaluate(() => document.body.innerText);
    const lines = t.split('\n').filter((l) => /counts|counted|left|days? (to go|left)|about \d+ days/i.test(l)).slice(0, 6);
    return lines.length ? `projects say: ${lines.join(' | ')}` : 'no counting lines on Projects';
  },
  finishBuilding: (page) => async () => {
    const r = await page.evaluate(async () => {
      const { db } = await import('/src/db/db.ts');
      const { PROJECTS } = await import('/src/football/content/projects.ts');
      const rows = await db.fbBundles.toArray();
      const open = rows.filter((b) => !b.done).map((b) => ({ b, p: PROJECTS.find((x) => x.id === b.id) })).filter((x) => x.p && x.p.needs?.length);
      if (!open.length) return null;
      const share = (x) => x.p.needs.reduce((t, n) => t + Math.min(1, (x.b.progress?.[n.what] ?? 0) / n.count), 0) / x.p.needs.length;
      const pick = open.sort((a, b) => share(b) - share(a))[0];
      const progress = { ...pick.b.progress };
      for (const n of pick.p.needs) progress[n.what] = Math.max(progress[n.what] ?? 0, n.count - 1);
      await db.fbBundles.put({ ...pick.b, progress });
      const save = await db.fbSave.get('save');
      if (save && (save.budget ?? 0) < (pick.p.money ?? 0)) await db.fbSave.put({ ...save, budget: (pick.p.money ?? 0) + 1 });
      return pick.p.name ?? pick.b.id;
    });
    return r ? `TEST NUDGE: ${r} set one day short of every need` : 'no open building to nudge';
  },
  research: (page) => async () => {
    // Each open tech in turn, until one the bank can pay for shows "Research it".
    await open(page, '/football/club?view=tree', 1500);
    const labels = await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || b.innerText).filter((t) => /: open$/.test(t ?? '')));
    for (const label of labels.slice(0, 20)) {
      await open(page, '/football/club?view=tree', 1000);
      if (!(await tap(page, new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), { wait: 900 }))) continue;
      if (await tap(page, /^Research it$/, { wait: 1200 })) return `researched ${label.replace(/: open$/, '')}`;
    }
    return `no open tech the bank covers (${labels.length} open techs tried)`;
  },
  kit: (page) => async () => {
    await open(page, '/football/club?view=kits', 1200);
    const designs = page.getByRole('button').filter({ hasText: /\b(sleeves|stripes|hoops|band|sash|fade|halves|chevron|yoke|print|wave)\b/i }).filter({ visible: true });
    const n = await designs.count();
    if (!n) return false;
    await designs.nth(Math.min(2, n - 1)).click();
    await page.waitForTimeout(900);
    await tap(page, /^(Wear it|Pick it|Pick this|Choose it|Yes|Confirm|Done)\b/);
    return `picked design ${Math.min(3, n)} of ${n}`;
  },
  title: (page) => async () => {
    await open(page, '/earned', 1200);
    if (!(await tap(page, /^Titles?\b/i))) return false;
    return taps(page, [/^(Wear|Use|Choose|Pick)\b/i]);
  },
  theme: (page) => async () => {
    await open(page, '/earned', 1200);
    if (!(await tap(page, /^Themes\b/i))) return false;
    const t = page.getByRole('button', { name: /^(Monsoon|Matchday|Aurora|Glacier|Blossom|Reef|Diwali):/ }).filter({ visible: true }).first();
    if (!(await t.count())) return 'no theme to wear';
    const name = (await t.getAttribute('aria-label')) ?? (await t.innerText());
    await t.click();
    await page.waitForTimeout(900);
    return `theme: ${name.split(':')[0]}`;
  },
  trialist: (page) => async () => {
    await open(page, '/football/trials', 1200);
    if (!(await tap(page, /^Tie to a habit$/, { wait: 1200 }))) return false;
    if (await page.getByText(/No new habit to tie to yet/).count()) return 'the tie page offers no habit (“No new habit to tie to yet”)';
    const habit = page.locator('[role=radio], .kd-opt button, button.k-row').filter({ visible: true }).first();
    if (await habit.count()) {
      await habit.click();
      await page.waitForTimeout(600);
    }
    return taps(page, [/^(Tie|Done|Save|Confirm|Tie him|Tie her)\b/]);
  },
  // The desk (O42): after each spend, what the app said back (a toast, a moment, or the page's new lines) and the
  // dice left, so "spent, but did it take?" has an answer.
  dice: (page) => async () => {
    await open(page, '/football/desk', 1500);
    const diceLeft = () => page.evaluate(async () => {
      const { db } = await import('/src/db/db.ts');
      const s = await db.fbSave.get('save');
      return JSON.stringify(s?.desk?.dice ?? s?.desk ?? null).length;
    });
    const r = [];
    for (let k = 0; k < 4; k++) {
      const before = await page.evaluate(() => document.body.innerText);
      const was = await diceLeft();
      const t = await taps(page, [/^(Spend|Roll|Use|Send|Place|Put)\b/i, /^(Yes|Confirm|Spend|Send|Do it)\b/]);
      if (!t) break;
      const said = await page.evaluate(() => [...document.querySelectorAll('.toasts .toast, .moment, .fb-moment')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
      const moments = await clearMoments(page, { shot: async () => '' }, 'desk');
      const after = await page.evaluate(() => document.body.innerText);
      const newLines = after.split('\n').filter((l) => l.trim().length > 8 && !before.includes(l)).slice(0, 3);
      const changed = (await diceLeft()) !== was;
      r.push(`${t}; said: ${[...said, ...moments, ...newLines].join(' / ') || 'nothing'}; store ${changed ? 'changed' : 'unchanged'}`);
    }
    return r.length ? r.join(' || ') : false;
  },
  // A cup run's first stop played through (O42): start, then keep playing cards and ending turns until the stop
  // shows its result or the run leaves the match; the last words on screen are the stop's outcome.
  cup: (page) => async () => {
    await open(page, '/football/cup', 1500);
    const t = await taps(page, [/^(Start a run|Carry on|Continue the run)\b/, /^Start the run$/, /^(Play|Kick off|Go|Next stop)\b/]);
    if (!t) return false;
    let moves = 0;
    for (let k = 0; k < 60; k++) {
      const text = await page.evaluate(() => document.body.innerText);
      if (/full time|you won|you lost|through to|knocked out|the stop is done|stop (won|lost)|run over/i.test(text)) break;
      const hit = (await tap(page, /^(Play|Play it|Shoot|Pass|Press|Tackle|Cross|Dribble)\b/i, { wait: 300 })) || (await tap(page, /^(End (the )?turn|Next|Carry on|Continue|Kick off)\b/i, { wait: 500 }));
      if (!hit) {
        const card = page.locator('.cup-card button, button.cup-card, [data-card]').filter({ visible: true }).first();
        if (!(await card.count())) break;
        await card.click({ timeout: 2000 }).catch(() => undefined);
        await page.waitForTimeout(300);
      }
      moves++;
    }
    const end = (await page.evaluate(() => document.body.innerText)).split('\n').filter((l) => l.trim()).slice(0, 6).join(' | ');
    return `${t}; ${moves} moves; at the end: ${end}`;
  },
  plan: (page) => async () => {
    await open(page, '/football', 1500);
    if (!(await tap(page, /^Change the plan$/, { wait: 900 }))) return false;
    const picked = [];
    for (const group of await page.getByRole('radiogroup').filter({ visible: true }).all()) {
      const off = group.getByRole('radio', { checked: false }).first();
      if (await off.count()) {
        await off.click();
        picked.push((await off.getAttribute('aria-label')) ?? (await off.innerText()));
        await page.waitForTimeout(400);
      }
    }
    await tap(page, /^Done$/);
    return `picked: ${picked.join(', ') || 'nothing (no choices shown)'}`;
  },
};

export async function onceOff(page, diary, name, log) {
  const fn = ACTIONS[name];
  if (!fn) return;
  const r = await step(page, diary, `once-off: ${name}`, fn(page));
  log?.(`    ${name}: ${r.ok ? 'done' : 'not done'}${r.note ? ` (${r.note})` : ''}`);
  return r;
}
