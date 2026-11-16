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
  building: (page) => async () => {
    await open(page, '/football/projects', 1200);
    return taps(page, [/^(Start|Build|Begin|Fund|Put)\b/i, /^(Start|Yes|Confirm|Build)\b/]);
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
  dice: (page) => async () => {
    await open(page, '/football/desk', 1500);
    const r = [];
    for (let k = 0; k < 4; k++) {
      const t = await taps(page, [/^(Spend|Roll|Use|Send|Place|Put)\b/i, /^(Yes|Confirm|Spend|Send|Do it)\b/]);
      if (!t) break;
      r.push(t);
      await clearMoments(page, { shot: async () => '' }, 'desk');
    }
    return r.length ? r.join('; ') : false;
  },
  cup: (page) => async () => {
    await open(page, '/football/cup', 1500);
    const t = await taps(page, [/^(Start a run|Carry on|Continue the run)\b/, /^Start the run$/, /^(Play|Kick off|Go|Next stop)\b/]);
    return t;
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
