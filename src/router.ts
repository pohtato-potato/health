import { useSyncExternalStore } from 'react';

/** Routes live in the hash, e.g. #/today?sheet=log, so any static host works. */
export interface Route {
  path: string;
  params: URLSearchParams;
}

const listeners = new Set<() => void>();
let snapshot = read();

function read(): Route & { key: string } {
  const raw = window.location.hash.replace(/^#/, '') || '/today';
  const [path, query = ''] = raw.split('?');
  return { path: path || '/today', params: new URLSearchParams(query), key: raw };
}

function notify() {
  const next = read();
  if (next.key === snapshot.key) return;
  snapshot = next;
  listeners.forEach((l) => l());
}

window.addEventListener('hashchange', notify);
window.addEventListener('popstate', notify);

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );
}

function href(path: string, params?: Record<string, string | undefined> | URLSearchParams): string {
  const p = params instanceof URLSearchParams ? params : new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined) as [string, string][]);
  const q = p.toString();
  return `#${path}${q ? `?${q}` : ''}`;
}

/**
 * Goes to a page. In-app moves are marked so Back knows it can step back.
 * Leaving a sheet for a page replaces the sheet, so Back skips over it.
 */
export function go(path: string, params?: Record<string, string | undefined>, opts: { replace?: boolean } = {}) {
  const url = href(path, params);
  const fromSheet = snapshot.params.has('sheet') && history.state?.sheet;
  if (opts.replace || fromSheet) history.replaceState({ inApp: !!history.state?.inApp }, '', url);
  else history.pushState({ inApp: true }, '', url);
  notify();
  window.scrollTo(0, 0);
}

export function openSheet(name: string, extra: Record<string, string> = {}) {
  const { path, params } = snapshot;
  const next = new URLSearchParams(params);
  next.set('sheet', name);
  for (const [k, v] of Object.entries(extra)) next.set(k, v);
  history.pushState({ inApp: true, sheet: true }, '', href(path, next));
  notify();
}

/** Closes the open sheet: a real Back when we opened it, so the gesture stays in step. */
export function closeSheet() {
  if (history.state?.sheet) {
    history.back();
    return;
  }
  const { path, params } = snapshot;
  const next = new URLSearchParams(params);
  for (const k of [...next.keys()]) if (k !== 'd') next.delete(k);
  history.replaceState(history.state, '', href(path, next));
  notify();
}

/** Swaps the open sheet for another without stacking history. */
export function replaceSheet(name: string, extra: Record<string, string> = {}) {
  const { path } = snapshot;
  const next = new URLSearchParams();
  const d = snapshot.params.get('d');
  if (d) next.set('d', d);
  next.set('sheet', name);
  for (const [k, v] of Object.entries(extra)) next.set(k, v);
  history.replaceState(history.state, '', href(path, next));
  notify();
}

/** Back to where you came from, or to a sensible parent when opened directly. */
export function back(fallback = '/today') {
  if (history.state?.inApp) history.back();
  else go(fallback, undefined, { replace: true });
}

export function clearParam(name: string) {
  const { path, params } = snapshot;
  const next = new URLSearchParams(params);
  next.delete(name);
  history.replaceState(history.state, '', href(path, next));
  notify();
}
