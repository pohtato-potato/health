#!/usr/bin/env node
// The week played forward: restores a backup in a real browser at the owner's phone size, plays days forward through
// the real screens, photographs every route each day, and flags what does not add up.
//
//   npm run check:week -- --backup <path> --days 7 --out <dir> [--start YYYY-MM-DD] [--port 5199]
//
// Everything it writes goes to --out, which must be outside the repository: the pictures and text hold personal data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startApp, boot, setNow, at } from './browser.mjs';
import { snapshot } from './inpage.mjs';
import { discover, capture, routerPaths, routeKey } from './survey.mjs';
import { weekPlan, stepsFor, addDays, KINDS } from './plan.mjs';
import { Diary, step, tap, clearMoments, morningFootball, morningLog, meals, closeRings, typeSteps, checklist, train, closeDay } from './owner.mjs';
import { onceOff } from './actions.mjs';
import { open } from './survey.mjs';
import { runChecks } from './checks.mjs';
import { writeReport } from './report.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function args(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
  return a;
}

const opt = args(process.argv.slice(2));
if (!opt.backup || !opt.out) {
  console.error('Usage: npm run check:week -- --backup <backup.json> --out <folder outside the repo> [--days 7] [--start YYYY-MM-DD]');
  process.exit(2);
}
const OUT = path.resolve(opt.out);
if (OUT.startsWith(ROOT + path.sep) || OUT === ROOT) {
  console.error('--out must be outside the repository: the pictures and text it writes hold personal data.');
  process.exit(2);
}
const DAYS = Number(opt.days ?? 7);
const backupText = fs.readFileSync(path.resolve(opt.backup), 'utf8');
const backup = JSON.parse(backupText);
const exported = new Date(backup.exportedAt ?? Date.now());
const ist = (d) => new Date(d.getTime() + 330 * 60_000).toISOString();
const START = opt.start ?? ist(exported).slice(0, 10);
const startClock = opt.start ? '07:30' : ist(exported).slice(11, 16);
fs.mkdirSync(OUT, { recursive: true });

const t0 = Date.now();
const log = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s] ${s}`);
const save = (file, data) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(data, null, 1));

const plan = weekPlan(START, DAYS);
const router = routerPaths(fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8'));
const goal = backup.tables.settings?.[0]?.targets?.steps ?? 10000;
let best = Math.max(0, ...(backup.tables.days ?? []).map((d) => d.steps ?? 0));

const app = await startApp({ port: Number(opt.port ?? 5199), root: ROOT });
const { page } = app;
const days = [];
try {
  log(`Restoring the backup; the week starts ${START} at ${startClock} (India time)`);
  await boot(app, backupText, at(START, startClock));
  const start = await page.evaluate(snapshot, START);

  log('Finding every route (each control clicked once, writes blocked)');
  const found = await discover(app.context, app.base, { log });
  const doors = [...found.routes].filter(([, r]) => r.from !== 'tab bar').map(([key, r]) => ({ from: routeKey(r.from), to: key, label: r.label, shape: r.label.replace(/\d[\d,.]*/g, '#') }));
  save('routes.json', { routes: [...found.routes].map(([key, r]) => ({ key, ...r })), overlays: found.overlays.map((o) => ({ page: o.page, label: o.label })), unvisited: found.unvisited, router });
  log(`Found ${found.routes.size} routes and ${found.overlays.length} overlays`);

  for (const p of [...plan, { i: DAYS, date: addDays(START, DAYS), kind: 'morningAfter', onceOff: [], train: false, watch: false }]) {
    const dir = path.join(OUT, 'days', p.date);
    fs.mkdirSync(dir, { recursive: true });
    const diary = new Diary(dir);
    const day = { date: p.date, kind: p.kind, train: p.train, opened: p.kind !== 'missed', bestBefore: best, pages: [], steps: diary.steps };
    days.push(day);
    const prev = days.at(-2);
    log(`${p.date}: ${KINDS[p.kind] ?? 'the morning after the week: the parcel and every page'}`);
    if (p.kind === 'missed') continue;

    // Morning.
    if (!(p.i === 0 && startClock > '07:30')) await setNow(app, at(p.date, '07:30'));
    await clearMoments(page, diary, 'on-open').then((m) => m.length && diary.steps.push({ name: 'moments on opening', ok: true, acks: [], moments: m }));
    day.morning = await page.evaluate(snapshot, p.date);
    await morningFootball(page, diary, { watch: p.watch });
    if (prev?.kind === 'missed') {
      await typeSteps(page, diary, stepsFor('usual', goal, best), { yesterday: true });
      await step(page, diary, 'food for yesterday', async () => {
        await open(page, `/food?d=${prev.date}`, 1000);
        let n = 0;
        for (let k = 0; k < 4; k++) if (await tap(page, /^Same as yesterday$|^Same as the day before$/, { wait: 500 })) n++;
        if (!n) for (let k = 0; k < 3; k++) if (await tap(page, /^Add /, { wait: 400 })) n++;
        return `${n} added`;
      });
      await step(page, diary, 'close yesterday', async () => {
        await open(page, `/close?d=${prev.date}`, 1000);
        return tap(page, /^Close (the day|\w+day)$/, { wait: 1200 });
      });
    }
    if (p.kind === 'morningAfter') {
      day.pages = await capture(app.context, app.base, found.routes, found.overlays, dir, { log });
      day.evening = await page.evaluate(snapshot, p.date);
      day.pathTexts = diary.texts;
      fs.writeFileSync(path.join(dir, 'state-evening.json'), JSON.stringify(day.evening, null, 1));
      fs.writeFileSync(path.join(dir, 'steps.json'), JSON.stringify(day.steps, null, 1));
      continue;
    }
    if (p.kind !== 'rest') await morningLog(page, diary, { ticks: p.kind === 'perfect' || p.kind === 'usual' });

    // The once-off actions, mid-morning.
    if (p.onceOff.length) {
      await setNow(app, at(p.date, '10:00'));
      for (const a of p.onceOff) await onceOff(page, diary, a, log);
    }

    // The day's logging.
    if (!['rest', 'sleepOnly'].includes(p.kind)) {
      await setNow(app, at(p.date, '13:30'));
      await meals(page, diary);
      if (p.train) {
        await setNow(app, at(p.date, '18:30'));
        await train(page, diary);
      }
      await setNow(app, at(p.date, '21:00'));
      const steps = stepsFor(p.kind, goal, best);
      if (steps) await typeSteps(page, diary, steps);
      await checklist(page, diary, { leave: p.kind === 'late' ? 1 : 0 });
      if (p.kind === 'perfect') await closeRings(page, diary);
      best = Math.max(best, steps ?? 0);
    }

    // Every route, as it stands at the end of the day.
    await setNow(app, at(p.date, '22:30'));
    day.pages = await capture(app.context, app.base, found.routes, found.overlays, dir, { log });
    if (['usual', 'record', 'perfect'].includes(p.kind)) {
      await setNow(app, at(p.date, '22:45'));
      await closeDay(page, diary);
    } else if (p.kind === 'late') {
      await setNow(app, at(addDays(p.date, 1), '01:30'));
      await closeDay(page, diary);
    }
    day.evening = await page.evaluate(snapshot, p.date);
    day.pathTexts = diary.texts;
    fs.writeFileSync(path.join(dir, 'state-morning.json'), JSON.stringify(day.morning, null, 1));
    fs.writeFileSync(path.join(dir, 'state-evening.json'), JSON.stringify(day.evening, null, 1));
    fs.writeFileSync(path.join(dir, 'steps.json'), JSON.stringify(day.steps, null, 1));
  }

  log('Checking');
  for (const d of days) d.start = d === days[0] ? start : undefined;
  const result = runChecks({ days, router, doors, reached: [...found.routes.keys()] });
  save('flags.json', result);
  save('week.json', days.map((d) => ({ date: d.date, kind: d.kind, morning: d.morning, evening: d.evening, steps: d.steps, pages: d.pages.map((p) => ({ key: p.key, shot: p.shot, audit: p.audit, errors: p.errors })) })));
  writeReport(OUT, { plan, days, result, routes: found, router, seconds: (Date.now() - t0) / 1000 });
  log(`Done: ${result.flags.length} flags. Report: ${path.join(OUT, 'report.md')}`);
} finally {
  await app.close();
}
