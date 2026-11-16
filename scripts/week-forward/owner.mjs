// The owner's own path through a day, done through the real screens: tap, type, hold, close.
// Each step is recorded (done, or why not), with what the app said back (toasts and moments) and a picture.
import fs from 'node:fs';
import path from 'node:path';
import { acks, overlayText } from './inpage.mjs';
import { open } from './survey.mjs';

export class Diary {
  constructor(dir) {
    this.dir = dir;
    this.steps = [];
    this.n = 0;
    this.texts = [];
    fs.mkdirSync(path.join(dir, 'path'), { recursive: true });
  }
  async shot(page, name) {
    const file = path.join(this.dir, 'path', `${String(++this.n).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: file }).catch(() => undefined);
    return file;
  }
  async text(page, name) {
    const t = await page.evaluate(() => document.body.innerText).catch(() => '');
    fs.writeFileSync(path.join(this.dir, 'path', `${String(this.n).padStart(2, '0')}-${name}.txt`), t);
    this.texts.push(t);
    return t;
  }
}

const role = (page, r, re) => page.getByRole(r, { name: re }).filter({ visible: true }).first();

/** Clicks the first visible button whose name matches; false if there is none. */
export async function tap(page, re, { r = 'button', wait = 400 } = {}) {
  const b = role(page, r, re);
  if (!(await b.count())) return false;
  await b.scrollIntoViewIfNeeded().catch(() => undefined);
  await b.click({ timeout: 3000 });
  await page.waitForTimeout(wait);
  return true;
}

/** A moment (full-screen, in a portal outside the app root): records it and closes it. */
export async function clearMoments(page, diary, where) {
  const seen = [];
  for (let k = 0; k < 8; k++) {
    const text = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.moment[role=dialog], .fb-moment[role=dialog], .lt-moment')].find((c) => c.innerText.trim().length > 3 && c.getBoundingClientRect().height > 100);
      return el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
    });
    if (!text) break;
    seen.push(text.slice(0, 400));
    await diary.shot(page, `moment-${where}`);
    const closed = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.moment[role=dialog], .fb-moment[role=dialog], .lt-moment')].find((c) => c.innerText.trim().length > 3 && c.getBoundingClientRect().height > 100);
      const b = el && (el.querySelector('button.btn.lg, button.fb-btn.pri, button[aria-label="Close"], .fb-btns button') || [...el.querySelectorAll('button')].pop());
      if (!b) return false;
      b.click();
      return true;
    });
    if (!closed) break;
    await page.waitForTimeout(500);
  }
  return seen;
}

/** Closes a sheet left open over the page (the owner would swipe it away) when the address names none. */
export async function calm(page) {
  for (let k = 0; k < 3; k++) {
    const stray = await page.evaluate(() => !location.hash.includes('sheet=') && !!document.querySelector('.sheet'));
    if (!stray) return;
    const close = page.locator('.sheet button[aria-label="Close"], .scrim').first();
    await close.click({ timeout: 2000, force: true }).catch(() => undefined);
    await page.waitForTimeout(400);
  }
}

/** Runs one step of the day; never throws. */
export async function step(page, diary, name, fn) {
  const rec = { name, ok: false, acks: [], moments: [] };
  try {
    const r = await fn();
    rec.ok = r !== false;
    if (typeof r === 'string') rec.note = r;
    if (r === false) rec.note = rec.note ?? 'nothing to tap';
  } catch (e) {
    rec.note = e.message.split('\n')[0].slice(0, 200);
  }
  await page.waitForTimeout(250);
  rec.acks = await page.evaluate(acks).catch(() => []);
  rec.moments = await clearMoments(page, diary, name.replace(/\W+/g, '-'));
  rec.shot = await diary.shot(page, name.replace(/\W+/g, '-'));
  diary.steps.push(rec);
  return rec;
}

// ---- The morning ----

/** The Football tab first thing: the parcel, then watch or skip last night's match. */
export async function morningFootball(page, diary, { watch }) {
  await step(page, diary, 'open Football', async () => {
    await open(page, '/football', 1500);
    await diary.text(page, 'football-morning');
  });
  // The morning parcel: open the first, then go on through each part, noting what it holds.
  if (await tap(page, /^Open the first$/, { wait: 900 })) {
    for (let k = 0; k < 8; k++) {
      await diary.text(page, `parcel-${k + 1}`);
      if (await page.getByRole('button', { name: /^(Watch|Skip)$/ }).filter({ visible: true }).count()) break;
      if (!(await tap(page, /^(Tap to go on|Next|Done)$/, { wait: 800 }))) break;
    }
  }
  const has = await page.getByRole('button', { name: /^(Watch|Skip)$/ }).filter({ visible: true }).count();
  if (!has) return step(page, diary, 'last night’s match', async () => 'no match waiting in the parcel');
  if (watch) {
    await step(page, diary, 'watch last night’s match live', async () => {
      await tap(page, /^Watch$/, { wait: 1200 });
      // Through the live match: kick off, answer calls with the first choice, half-time, full time.
      for (let k = 0; k < 60; k++) {
        if (await tap(page, /^(Kick off|Play on|Second half|Carry on|Continue|See the result|Full time|Skip to the result|Let it play)/i, { wait: 700 })) continue;
        const call = page.locator('.md-call button, .call button, [data-call] button').filter({ visible: true }).first();
        if (await call.count()) {
          await call.click().catch(() => undefined);
          await page.waitForTimeout(700);
          continue;
        }
        if (!/\/football\/match/.test(await page.evaluate(() => location.hash))) break;
        await page.waitForTimeout(1500);
      }
      await diary.text(page, 'match-watched');
      return 'watched';
    });
  } else {
    await step(page, diary, 'skip last night’s match', () => tap(page, /^Skip$/, { wait: 1500 }));
  }
  await step(page, diary, 'the rest of the parcel', async () => {
    await open(page, '/football', 1200);
    let k = 0;
    for (; k < 10; k++) {
      await diary.text(page, `parcel-rest-${k + 1}`);
      if (!(await tap(page, /^(Open the first|Tap to go on|Next|Done)$/, { wait: 800 }))) break;
    }
    await clearMoments(page, diary, 'parcel');
    await open(page, '/football', 1200);
    await diary.text(page, 'football-after');
    return `${k} taps through the parcel`;
  });
}

/** The morning log: same sleep as last night, the morning checklist rows, saved. */
export async function morningLog(page, diary, { ticks }) {
  return step(page, diary, 'log the morning', async () => {
    await open(page, '/today', 900);
    await calm(page);
    if (!(await tap(page, /^Log the morning$/, { wait: 700 }))) await open(page, '/today?sheet=morning', 900);
    const sheet = page.locator('.sheet').last();
    if (!(await sheet.count())) return 'no morning sheet';
    const same = sheet.getByRole('button', { name: /same as (last night|yesterday)/i }).first();
    if (await same.count()) await same.click().catch(() => undefined);
    if (ticks) {
      for (const sw of await sheet.getByRole('switch').all()) {
        if ((await sw.getAttribute('aria-checked')) !== 'true') await sw.click().catch(() => undefined);
      }
    }
    const saveBtn = sheet.getByRole('button', { name: /^Save the morning$/ });
    if (!(await saveBtn.count())) return 'no save button';
    await saveBtn.scrollIntoViewIfNeeded().catch(() => undefined);
    await saveBtn.click({ timeout: 5000 });
    await page.waitForTimeout(800);
  });
}

// ---- Food ----

/** Each meal "Same as yesterday" where offered, else the first quick add. */
export async function meals(page, diary) {
  return step(page, diary, 'food for each meal', async () => {
    await open(page, '/today', 900);
    await calm(page);
    // Only the meal rows on the page itself: sheets sit outside #root.
    const root = page.locator('#root');
    let same = 0;
    for (let k = 0; k < 4; k++) {
      const b = root.getByRole('button', { name: /^Same as yesterday$/ }).filter({ visible: true }).first();
      if (!(await b.count())) break;
      await b.click({ timeout: 3000 });
      await page.waitForTimeout(600);
      same++;
    }
    if (!same) {
      for (let k = 0; k < 3; k++) {
        const b = root.getByRole('button', { name: /^Add / }).filter({ visible: true }).first();
        if (await b.count()) await b.click({ timeout: 3000 }).then(() => page.waitForTimeout(500));
      }
      return 'no “Same as yesterday”: used quick add three times';
    }
    return `${same} meals as yesterday`;
  });
}

/** Quick adds until every ring is closed (at most eight). */
export async function closeRings(page, diary) {
  return step(page, diary, 'close every ring', async () => {
    await open(page, '/today', 900);
    await calm(page);
    for (let k = 0; k < 8; k++) {
      const label = (await page.getByRole('button', { name: /^Rings/ }).first().getAttribute('aria-label').catch(() => '')) ?? '';
      const m = label.match(/(\d) of (\d) closed/);
      if (m && m[1] === m[2]) return `rings: ${m[0]}`;
      const adds = page.getByRole('button', { name: /^Add .*(protein|whey|shake|egg|tofu|paneer|chicken)/i }).filter({ visible: true });
      if (!(await adds.count())) {
        if (!(await tap(page, /^Add /, { wait: 500 }))) return 'no quick add';
      } else {
        await adds.first().click();
        await page.waitForTimeout(500);
      }
    }
    const label = await page.getByRole('button', { name: /^Rings/ }).first().getAttribute('aria-label').catch(() => '');
    return `stopped after eight adds; ${label}`;
  });
}

// ---- Steps ----

export async function typeSteps(page, diary, steps, { yesterday = false } = {}) {
  return step(page, diary, yesterday ? `steps for yesterday (${steps})` : `type steps (${steps})`, async () => {
    await open(page, '/today', 900);
    await calm(page);
    if (!(await tap(page, /^Type steps$/, { wait: 600 }))) await open(page, '/today?sheet=steps', 900);
    if (yesterday) await tap(page, /^Yesterday$/, { r: 'radio', wait: 300 });
    const input = page.locator('input[inputmode="numeric"], input[type="number"], input[type="tel"]').filter({ visible: true }).first();
    if (!(await input.count())) return 'no steps field';
    await input.fill(String(steps));
    if (!(await tap(page, /^Save$/, { wait: 700 }))) return 'no save';
  });
}

// ---- Checklist ----

/** Ticks checklist rows (keyboard Enter, the rows' own shortcut for a press and hold). */
export async function checklist(page, diary, { leave = 0 } = {}) {
  return step(page, diary, leave ? `checklist, leaving ${leave}` : 'checklist, every row', async () => {
    await open(page, '/today', 900);
    await calm(page);
    const todo = page.getByRole('button', { name: /, to do\. Press and hold to tick$/ });
    let n = 0;
    for (let k = 0; k < 20 && (await todo.count()) > leave; k++) {
      await todo.first().focus({ timeout: 3000 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      n++;
    }
    return `${n} ticked`;
  });
}

// ---- Training ----

/** Starts the suggested session on Train and completes every set at the prefilled numbers. */
export async function train(page, diary) {
  return step(page, diary, 'training session', async () => {
    await open(page, '/train', 1200);
    await calm(page);
    if (!(await tap(page, /^Start [A-Z]\b|^Start the session|^Start$/, { wait: 1500 }))) {
      if (!(await tap(page, /^(Back to the session|Resume)/, { wait: 1200 }))) return 'no start button on Train';
    }
    await tap(page, /^(Start|Go|Begin)$/, { wait: 800 });
    // The live view logs one set at a time; the owner logs sets afterwards, in the set list.
    if (await tap(page, /^Session$/, { wait: 600 })) await tap(page, /^Open the set list$/, { wait: 900 });
    let sets = 0;
    for (let k = 0; k < 160; k++) {
      await clearMoments(page, diary, 'session');
      const ok = page.locator('button[aria-label^="Complete set"]').filter({ visible: true }).first();
      if (await ok.count()) {
        await ok.click();
        await page.waitForTimeout(300);
        // A set with no numbers from last time: type the bottom of the range, as the owner would.
        if (await page.getByText('Add the reps first.').filter({ visible: true }).count()) {
          const reps = page.locator('input[aria-label="Reps"], input[aria-label="Secs"], input[aria-label="Steps"]').filter({ visible: true }).first();
          if (!(await reps.count())) break;
          await reps.fill('10');
          await ok.click();
          await page.waitForTimeout(300);
        }
        sets++;
        await tap(page, /^(End rest|Skip rest|Skip the rest|Done resting)/i, { wait: 150 });
        if (sets > 60) break;
        continue;
      }
      if (await tap(page, /^Up next/, { wait: 500 })) continue;
      const next = page.locator('button:has(.lbl:text-is("Up next")), button:has-text("Up next")').filter({ visible: true }).first();
      if (await next.count()) {
        await next.click();
        await page.waitForTimeout(500);
        continue;
      }
      break;
    }
    if (!(await tap(page, /^Finish session$/, { wait: 1200 }))) await tap(page, /^Finish$/, { wait: 1200 });
    await tap(page, /^(Finish|Yes, finish|Finish anyway|Save)$/, { wait: 1200 });
    await clearMoments(page, diary, 'session-done');
    await diary.text(page, 'session-done');
    return `${sets} sets completed`;
  });
}

// ---- Closing ----

export async function closeDay(page, diary) {
  return step(page, diary, 'close the day', async () => {
    await open(page, '/close', 1200);
    await calm(page);
    if (!(await tap(page, /^Close the day$/, { wait: 1500 }))) return 'no close button';
    await diary.text(page, 'closed');
  });
}

export { overlayText };
