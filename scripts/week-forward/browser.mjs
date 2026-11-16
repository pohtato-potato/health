// Starts the app (Vite dev server, local only) and a real Chrome at the owner's phone size, dark, in India's time zone.
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { initScript, restore } from './inpage.mjs';

export const VIEWPORT = { width: 360, height: 745 };
export const TZ = 'Asia/Kolkata';

/** The UTC instant of a local (India) wall-clock time on a day: at('2026-11-17', '07:30'). */
export const at = (date, hhmm) => new Date(`${date}T${hhmm}:00+05:30`);

export async function startApp({ port = 5199, root = process.cwd() } = {}) {
  const server = await createServer({ root, server: { port, strictPort: true, hmr: false }, logLevel: 'error', clearScreen: false });
  await server.listen();
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-features=Translate'] });
  const context = await browser.newContext({
    viewport: VIEWPORT, deviceScaleFactor: 2, colorScheme: 'dark', reducedMotion: 'no-preference',
    timezoneId: TZ, locale: 'en-IN', serviceWorkers: 'block', hasTouch: true, isMobile: true,
  });
  // Nothing leaves the machine: only the local app is reachable.
  await context.route((url) => !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url.href) && !url.href.startsWith('data:') && !url.href.startsWith('blob:'), (r) => r.abort());
  await context.addInitScript(initScript);
  const page = await context.newPage();
  const base = `http://localhost:${port}/`;
  return {
    server, browser, context, page, base,
    async close() {
      await browser.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    },
  };
}

/** Sets "now" in the browser (the app's clock), then reloads so every page reads the new day from scratch. */
export async function setNow(app, when, { reload = true } = {}) {
  await app.context.clock.setSystemTime(when);
  if (reload) {
    await app.page.goto(app.base + '#/today');
    await app.page.reload();
    await app.page.waitForTimeout(1500);
  }
}

export async function boot(app, backupText, when) {
  await app.context.clock.install({ time: when });
  await app.page.goto(app.base + '#/today');
  await app.page.waitForTimeout(1200);
  await app.page.evaluate(restore, backupText);
  await app.page.reload();
  await app.page.waitForTimeout(2500);
}
