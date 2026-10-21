import { doneTodayLine, loggedLater, unfinishedInSession } from '../domain/trainingChecks';
import { findSession } from '../domain/plan';
import type { Settings, TrainingSession } from '../domain/types';
import { useAllSets, useNow, useSessions } from '../db/hooks';
import { go } from '../router';
import { usualLength } from '../domain/sessionEdges';
import { NextStrip } from './today/NextStrip';
import type { NextUp } from '../state/derived';
import { logHour } from '../domain/dates';

export function NextUpCard({
  settings,
  up,
  active,
  trainedToday,
  weeks,
  ready,
}: {
  settings: Settings;
  up: NextUp | undefined;
  active: TrainingSession | null;
  trainedToday: TrainingSession[];
  weeks: { thisWeek: number; perWeek: number };
  /** Readiness as a word, e.g. "Steady · sleep held it back". */
  ready?: string;
}) {
  const plan = settings.plan;
  const sets = useAllSets();
  const sessions = useSessions();
  const now = useNow(active ? 1000 : 60_000);

  const week = { done: Math.min(weeks.thisWeek, weeks.perWeek), of: weeks.perWeek };
  if (active) {
    const def = plan ? findSession(plan, active.session) : undefined;
    const n = sets?.filter((s) => s.sessionId === active.id && !s.drop).length ?? 0;
    return <NextStrip title={`${def?.name ?? `Session ${active.session}`} · in progress`} sub={`${clock(now - active.startedAt)} · ${n} set${n === 1 ? '' : 's'} logged${active.short ? ' · short session' : ''}`} week={week} action={{ label: 'Resume', run: () => go('/session') }} onOpen={() => go('/session')} />;
  }

  if (!plan || !up) {
    return <NextStrip title="No plan yet" sub="Add one in Settings and Train runs it: the rotation, loads and every rule." action={{ label: 'Add a plan', run: () => go('/settings', { at: 'training' }) }} onOpen={() => go('/settings', { at: 'training' })} />;
  }

  const def = findSession(plan, up.sessionId);
  if (trainedToday.length) {
    const s = trainedToday[trainedToday.length - 1];
    const sd = findSession(plan, s.session);
    const n = sets?.filter((x) => x.sessionId === s.id && !x.drop).length ?? 0;
    const mins = Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60000);
    // The same unfinished-sets check as Train, so Today never calls a placeholder session a clean finish.
    const done = doneTodayLine({
      mins,
      later: !!sets && loggedLater(sets.filter((x) => x.sessionId === s.id)),
      sets: n,
      short: s.short,
      unfinished: sets ? unfinishedInSession(s.id, sets, settings.keptSets) : 0,
    });
    return <NextStrip title={sd?.name ?? `Session ${s.session}`} sub={`${done.text}. Next time: ${def?.name ?? up.sessionId}.`} week={week} onOpen={() => (done.clean ? go('/session/view', { id: s.id }) : go('/train'))} />;
  }

  const readyN = up.exercises.filter((e) => e.status.advice && e.status.advice.kind !== 'maxed').length;
  const met = weeks.thisWeek >= weeks.perWeek;
  const usual = sets && sessions ? usualLength(sessions, sets, up.sessionId, def?.minutes ?? 60) : { min: def?.minutes ?? 60, fromHistory: false };
  const evening = logHour(Date.now()) >= 15;
  return (
    <NextStrip
      title={`${def?.name ?? `Session ${up.sessionId}`} ${met ? 'if you feel fresh' : evening ? 'tonight' : 'today'}`}
      sub={`${usual.fromHistory ? 'Usually' : 'About'} ${usual.min} min${readyN ? ` · ${readyN} ready to go heavier` : ''}${up.swaps.length ? ` · ${up.swaps.length} swap${up.swaps.length === 1 ? '' : 's'} for a flag` : ''}`}
      ready={ready}
      week={week}
      action={evening ? { label: 'Start', run: () => go('/session', { start: up.sessionId }) } : undefined}
      onOpen={() => go('/train')}
    />
  );
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
